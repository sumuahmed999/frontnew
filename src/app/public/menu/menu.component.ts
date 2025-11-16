import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FoodOrderService } from '../../service/food-order.service';
import { Subject, takeUntil } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MenuItem {
  itemId: number;
  categoryId: number;
  categoryName: string;
  subcategoryId: number;
  subcategoryName: string;
  itemName: string;
  description: string;
  price: number;
  discountedPrice: number | null;
  discountPercentage: number;
  isPromotion: boolean;
  promotionLabel: string | null;
  images: string[];
  ingredients: string;
  allergenInfo: string | null;
  nutritionalInfo: any;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  spiceLevel: number;
  preparationTime: number;
  availabilityStatus: string;
  displayOrder: number;
  isActive: boolean;
  createdDate: string;
  effectivePrice: number;
  hasDiscount: boolean;
}

interface MenuApiResponse {
  success: boolean;
  data: MenuItem[];
  message: string;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  restaurantInfo?: RestaurantInfo;
}

interface RestaurantInfo {
  tenantId: number;
  tenantName: string;
  tenantCode: string;
  address?: string;
  city?: string;
  phone?: string;
  isActive: boolean;
  takeOrders: boolean;
}

// Existing booking items from API
interface BookingItemFromAPI {
  ItemId: number;
  ItemName: string;
  CategoryId: number;
  CategoryName?: string;
  SubcategoryId?: number;
  SubcategoryName?: string;
  Price: number;
  DiscountedPrice?: number;
  Quantity: number;
  SpecialInstructions?: string;
  AddedAt: string;
  UpdatedAt: string;
  Status: string;
}

interface BookingDetailsResponse {
  bookingId: string;
  busNumber: string;
  busName: string;
  startLocation: any;
  endLocation: any;
  departureDate: string;
  departureTime: string;
  bookingStatus: string;
  paymentStatus: string;
  bookimgItems?: string; // JSON string
  totalAmount: number;
  createdAt: string;
  route: any;
  stepOvers: any[];
}

// Booking Items API Interfaces
interface AddBookingItemDto {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName?: string;
  subcategoryId?: number;
  subcategoryName?: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  specialInstructions?: string;
}

interface UpdateBookingItemsRequest {
  itemsToAdd?: AddBookingItemDto[];
  itemsToCancel?: any[];
}

interface BookingItemDto {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName?: string;
  subcategoryId?: number;
  subcategoryName?: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
  specialInstructions?: string;
  addedAt: string;
  updatedAt: string;
  status: string;
}

interface UpdateBookingItemsResponse {
  bookingId: string;
  activeItems: BookingItemDto[];
  canceledItems: BookingItemDto[];
  totalAmount: number;
  itemCount: number;
  canceledItemCount: number;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

@Component({
  selector: 'app-menu',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit, OnDestroy {
  // Subscription management
  private destroy$ = new Subject<void>();
  
  // API configuration
  private readonly API_BASE_URL = environment.apiBaseUrl;
  private readonly MENU_ENDPOINT = '/menuitem/restaurant';
  private readonly BOOKING_ENDPOINT = '/search/booking';
  
  // Component properties
  selectedRestaurant: any = {};
  restaurantId: number = 0;
  bookingID: string = '';
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  searchQuery: string = '';
  viewMode: 'list' | 'grid' = 'list';
  cartItems: any[] = [];
  cartItemsCount: number = 0;
  cartTotal: number = 0;
  
  // Loading states
  isLoading: boolean = true;
  isLoadingMenu: boolean = false;
  isLoadingCart: boolean = false;
  isUpdatingBooking: boolean = false;
  menuError: string = '';
  
  // Cart sidebar properties
  isCartOpen: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private foodOrderService: FoodOrderService
  ) {}

  ngOnInit() {
    // Get restaurant ID and booking ID from query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.restaurantId = parseInt(params['restaurantId']) || 0;
        this.bookingID = params['bookingId'] || '';
        console.log('Menu component initialized - Restaurant ID:', this.restaurantId, 'Booking ID:', this.bookingID);
        
        if (this.restaurantId) {
          this.loadMenuFromAPI();
        } else {
          this.menuError = 'Restaurant ID not provided';
          this.isLoading = false;
        }

        // Load existing cart items from booking if booking ID exists
        if (this.bookingID) {
          this.loadExistingBookingItems();
        }
      });

    // Subscribe to order data with proper cleanup
    this.foodOrderService.orderData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data.restaurant && !this.selectedRestaurant.tenantId) {
          this.selectedRestaurant = {
            tenantId: data.restaurant.id,
            tenantName: data.restaurant.name,
            deliveryTime: data.restaurant.deliveryTime || 20,
            rating: data.restaurant.rating || 4.0
          };
        }
      });

    // Subscribe to cart items with proper cleanup
    this.foodOrderService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.cartItemsCount = items.reduce((count, item) => count + item.quantity, 0);
        this.cartTotal = this.foodOrderService.getCartTotal();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load existing booking items from API
  private loadExistingBookingItems() {
    if (!this.bookingID) return;

    this.isLoadingCart = true;
    console.log('Loading existing booking items for booking ID:', this.bookingID);

    const apiUrl = `${this.API_BASE_URL}${this.BOOKING_ENDPOINT}/${this.bookingID}/details`;

    this.http.get<ApiResponse<BookingDetailsResponse>>(apiUrl)
      .pipe(
        catchError(error => {
          console.error('Error loading booking items:', error);
          return of({
            success: false,
            message: 'Failed to load existing booking items'
          } as ApiResponse<BookingDetailsResponse>);
        }),
        finalize(() => {
          this.isLoadingCart = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Booking details response:', response);
          
          if (response.success && response.data && response.data.bookimgItems) {
            try {
              const existingItems: BookingItemFromAPI[] = JSON.parse(response.data.bookimgItems);
              console.log('Existing booking items:', existingItems);
              
              if (existingItems && existingItems.length > 0) {
                // Clear current cart first
                this.foodOrderService.clearCart();
                
                // Add existing items to cart
                existingItems.forEach(item => {
                  if (item.Status === 'Active') { // Only add active items
                    const cartItem = {
                      id: item.ItemId,
                      name: item.ItemName,
                      price: item.DiscountedPrice || item.Price,
                      image: this.getItemImageById(item.ItemId), // Get image from menu items
                      quantity: item.Quantity,
                      specialInstructions: item.SpecialInstructions
                    };
                    
                    // Add item to cart service multiple times for quantity
                    for (let i = 0; i < item.Quantity; i++) {
                      this.foodOrderService.addToCart({
                        id: cartItem.id,
                        name: cartItem.name,
                        price: cartItem.price,
                        image: cartItem.image
                      });
                    }
                  }
                });
                
                console.log(`Loaded ${existingItems.length} existing items into cart`);
              }
            } catch (error) {
              console.error('Error parsing existing booking items:', error);
            }
          } else {
            console.log('No existing booking items found');
          }
        },
        error: (error) => {
          console.error('Error loading existing booking items:', error);
        }
      });
  }

  // Helper method to get item image by ID
  private getItemImageById(itemId: number): string {
    const menuItem = this.menuItems.find(item => item.itemId === itemId);
    if (menuItem) {
      return this.getItemImage(menuItem);
    }
    return 'https://via.placeholder.com/200x200/e2e8f0/64748b?text=Food';
  }

  // Load menu from API
  loadMenuFromAPI() {
    if (!this.restaurantId) {
      this.menuError = 'Invalid restaurant ID';
      this.isLoading = false;
      return;
    }

    this.isLoadingMenu = true;
    this.menuError = '';
    this.isLoading = true;

    console.log(`Loading menu for restaurant ID: ${this.restaurantId}`);

    let params = new HttpParams()
      .set('isActive', 'true')
      .set('availabilityStatus', 'available')
      .set('pageSize', '100');

    const apiUrl = `${this.API_BASE_URL}${this.MENU_ENDPOINT}/${this.restaurantId}`;

    this.http.get<MenuApiResponse>(apiUrl, { params })
      .pipe(
        catchError(error => {
          console.error('Menu API error:', error);
          this.menuError = this.getErrorMessage(error);
          return of({
            success: false,
            data: [],
            message: 'Failed to load menu',
            totalCount: 0,
            page: 1,
            pageSize: 0,
            totalPages: 0,
            restaurantInfo: undefined
          } as MenuApiResponse);
        }),
        finalize(() => {
          this.isLoadingMenu = false;
          this.isLoading = false;
          
          // Load existing cart items after menu is loaded
          if (this.bookingID && this.menuItems.length > 0) {
            setTimeout(() => {
              this.loadExistingBookingItems();
            }, 500);
          }
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Menu API response:', response);
          
          if (response.success && response.data && response.data.length > 0) {
            this.menuItems = response.data;
            this.extractCategories();
            this.filterMenu();
            
            if (response.restaurantInfo) {
              this.selectedRestaurant = {
                tenantId: response.restaurantInfo.tenantId,
                tenantName: response.restaurantInfo.tenantName,
                tenantCode: response.restaurantInfo.tenantCode,
                address: response.restaurantInfo.address,
                city: response.restaurantInfo.city,
                phone: response.restaurantInfo.phone,
                deliveryTime: 20,
                rating: 4.0,
                isActive: response.restaurantInfo.isActive,
                takeOrders: response.restaurantInfo.takeOrders
              };
            }
            
            console.log(`Loaded ${this.menuItems.length} menu items`);
            this.menuError = '';
          } else {
            this.menuError = response.message || 'No menu items found for this restaurant';
            this.loadFallbackMenu();
          }
        },
        error: (error) => {
          console.error('Menu subscription error:', error);
          this.loadFallbackMenu();
        }
      });
  }

  // Update booking items via API
  private updateBookingItems(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.bookingID || this.cartItems.length === 0) {
        console.warn('No booking ID or cart items to update');
        resolve(false);
        return;
      }

      this.isUpdatingBooking = true;

      // Convert cart items to booking items format
      const itemsToAdd: AddBookingItemDto[] = this.cartItems.map(cartItem => {
        // Find the menu item for additional details
        const menuItem = this.menuItems.find(item => item.itemId === cartItem.id);
        
        return {
          itemId: cartItem.id,
          itemName: cartItem.name,
          categoryId: menuItem?.categoryId || 0,
          categoryName: menuItem?.categoryName || 'Unknown',
          subcategoryId: menuItem?.subcategoryId || undefined,
          subcategoryName: menuItem?.subcategoryName || undefined,
          price: menuItem?.price || cartItem.price,
          discountedPrice: menuItem?.discountedPrice || undefined,
          quantity: cartItem.quantity,
          specialInstructions: cartItem.specialInstructions || undefined
        };
      });

      const requestData: UpdateBookingItemsRequest = {
        itemsToAdd: itemsToAdd
      };

      const apiUrl = `${this.API_BASE_URL}${this.BOOKING_ENDPOINT}/${this.bookingID}/items`;

      console.log('Updating booking items:', {
        bookingId: this.bookingID,
        itemsCount: itemsToAdd.length,
        totalAmount: this.cartTotal
      });

      this.http.put<ApiResponse<UpdateBookingItemsResponse>>(apiUrl, requestData)
        .pipe(
          catchError(error => {
            console.error('Booking update API error:', error);
            const errorMessage = this.getErrorMessage(error);
            throw new Error(errorMessage);
          }),
          finalize(() => {
            this.isUpdatingBooking = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Booking update response:', response);
            
            if (response.success && response.data) {
              console.log(`Successfully updated booking with ${response.data.itemCount} items`);
              console.log(`Total amount: ₹${response.data.totalAmount}`);
              
              // Clear the cart after successful update
              this.foodOrderService.clearCart();
              resolve(true);
            } else {
              const error = response.message || 'Failed to update booking items';
              console.error('Booking update failed:', error);
              reject(new Error(error));
            }
          },
          error: (error) => {
            console.error('Booking update subscription error:', error);
            reject(error);
          }
        });
    });
  }

  // Get user-friendly error message
  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'Booking not found or restaurant not available';
    } else if (error.status === 400) {
      return 'Invalid booking data. Please check your order.';
    } else if (error.status === 0) {
      return 'Unable to connect to server. Please check your connection.';
    } else if (error.status >= 500) {
      return 'Server error. Please try again later.';
    } else if (error.error?.message) {
      return error.error.message;
    } else {
      return error.message || 'An unexpected error occurred';
    }
  }

  // Retry loading menu
  retryLoadMenu() {
    this.loadMenuFromAPI();
  }

  // Load fallback menu
  loadFallbackMenu() {
    console.log('Loading fallback menu data');
    this.menuItems = [];
    this.selectedRestaurant = {
      tenantId: this.restaurantId,
      tenantName: 'Restaurant',
      deliveryTime: 20,
      rating: 4.0,
      isActive: true,
      takeOrders: true
    };
    this.extractCategories();
    this.filterMenu();
    this.menuError = '';
  }

  extractCategories() {
    const uniqueCategories = [...new Set(this.menuItems.map(item => item.categoryName))];
    this.categories = ['All', ...uniqueCategories.sort()];
  }

  filterMenu() {
    let filtered = this.menuItems;

    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.categoryName === this.selectedCategory);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.itemName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        item.subcategoryName.toLowerCase().includes(query) ||
        item.ingredients.toLowerCase().includes(query)
      );
    }

    this.filteredItems = filtered;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.filterMenu();
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterMenu();
  }

  setViewMode(mode: 'list' | 'grid') {
    this.viewMode = mode;
  }

  getItemImage(item: MenuItem): string {
    return item.images && item.images.length > 0 
      ? item.images[0] 
      : 'https://via.placeholder.com/200x200/e2e8f0/64748b?text=Food';
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  trackByItemId(index: number, item: MenuItem): number {
    return item.itemId;
  }

  onImageError(event: any) {
    event.target.src = 'https://via.placeholder.com/200x200/e2e8f0/64748b?text=Food';
  }

  viewItemDetails(item: MenuItem) {
    console.log('View item details:', item);
  }

  // Cart Methods
  toggleCart() {
    this.isCartOpen = !this.isCartOpen;
  }

  closeCart() {
    this.isCartOpen = false;
  }

  openCart() {
    this.toggleCart();
  }

  addToCart(item: MenuItem, event: Event) {
    event.stopPropagation();
    
    this.foodOrderService.addToCart({
      id: item.itemId,
      name: item.itemName,
      price: item.effectivePrice,
      image: this.getItemImage(item)
    });
  }

  getItemQuantity(itemId: number): number {
    const item = this.cartItems.find(cartItem => cartItem.id === itemId);
    return item ? item.quantity : 0;
  }

  increaseQuantity(item: MenuItem, event: Event) {
    event.stopPropagation();
    const currentQty = this.getItemQuantity(item.itemId);
    this.foodOrderService.updateQuantity(item.itemId, currentQty + 1);
  }

  decreaseQuantity(item: MenuItem, event: Event) {
    event.stopPropagation();
    const currentQty = this.getItemQuantity(item.itemId);
    if (currentQty > 1) {
      this.foodOrderService.updateQuantity(item.itemId, currentQty - 1);
    } else if (currentQty === 1) {
      this.removeFromCart(item.itemId);
    }
  }

  updateCartItemQuantity(itemId: number, change: number) {
    const currentQty = this.getItemQuantity(itemId);
    const newQty = currentQty + change;
    
    if (newQty <= 0) {
      this.removeFromCart(itemId);
    } else {
      this.foodOrderService.updateQuantity(itemId, newQty);
    }
  }

  removeFromCart(itemId: number) {
    this.foodOrderService.removeFromCart(itemId);
  }

  clearCart() {
    this.foodOrderService.clearCart();
    this.closeCart();
  }

  // Updated checkout method with API call
  async proceedToCheckout() {
    if (this.cartItemsCount === 0) {
      console.warn('Cannot checkout with empty cart');
      return;
    }

    try {
      console.log('Starting checkout process...');
      
      // Show loading state
      this.isUpdatingBooking = true;

      // Update booking items via API
      const success = await this.updateBookingItems();

      if (success) {
        console.log('Booking updated successfully, proceeding to checkout...');
        
        // Close cart and navigate to next step
        this.closeCart();
        
        // Navigate to mobile verification or payment page
        this.router.navigate(['/mobile-verification'], {
          queryParams: {
            bookingId: this.bookingID,
            restaurantId: this.restaurantId,
            totalAmount: this.cartTotal
          }
        });
      } else {
        console.error('Failed to update booking items');
        alert('Failed to update your order. Please try again.');
      }
    } catch (error) {
      console.error('Checkout process failed:', error);
      
      let errorMessage = 'Failed to process your order. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      this.isUpdatingBooking = false;
    }
  }

  goBack() {
    this.router.navigate(['/restaurants'], {
      queryParams: { 
        bookingId: this.bookingID,
        stopId: this.route.snapshot.queryParams['stopOverId']
      }
    });
  }
}
