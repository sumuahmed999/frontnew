import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuItemRequest, MenuItemResponse, MenuItemService } from '../../../service/menu-item.service';
import { MenuCategoryResponse, MenuCategoryService } from '../../../service/menu-category.service';
import { MenuSubcategoryResponse, MenuSubcategoryService } from '../../../service/menu-subcategory.service';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss'
})
export class MenuItemComponent implements OnInit, OnDestroy {
  itemForm!: FormGroup;
  menuItems: MenuItemResponse[] = [];
  categories: MenuCategoryResponse[] = [];
  subcategories: MenuSubcategoryResponse[] = [];
  
  // File handling
  selectedFiles: FileList | null = null;
  previewImages: string[] = [];
  
  // Loading states
  isLoading = false;
  isLoadingCategories = false;
  isLoadingSubcategories = false;
  isSubmitting = false;
  
  // UI state
  successMessage = '';
  errorMessage = '';
  editingItemId: number | null = null;
  showAdvancedOptions = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  searchTerm = '';
  filterActive?: boolean;
  filterCategoryId?: number;
  filterSubcategoryId?: number;
  filterIsPromotion?: boolean;
  filterAvailabilityStatus?: string;
  
  // Availability status options
  availabilityStatuses = [
    { value: 'available', label: 'Available' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'limited', label: 'Limited' }
  ];
  
  // Spice level options
  spiceLevels = [
    { value: 0, label: 'Not Spicy' },
    { value: 1, label: 'Mild' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Hot' },
    { value: 4, label: 'Very Hot' },
    { value: 5, label: 'Extremely Hot' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private menuItemService: MenuItemService,
    private categoryService: MenuCategoryService,
    private subcategoryService: MenuSubcategoryService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadCategories();
    this.loadMenuItems();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm() {
    this.itemForm = this.fb.group({
      categoryId: ['', Validators.required],
      subcategoryId: [''],
      itemName: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      discountedPrice: ['', [Validators.min(0)]],
      discountPercentage: [0, [Validators.min(0), Validators.max(100)]],
      isPromotion: [false],
      promotionLabel: ['', Validators.maxLength(100)],
      ingredients: [''],
      allergenInfo: [''],
      nutritionalInfo: [''],
      isVegetarian: [false],
      isVegan: [false],
      isSpicy: [false],
      spiceLevel: [0, [Validators.min(0), Validators.max(5)]],
      preparationTime: [0, [Validators.min(0)]],
      availabilityStatus: ['available'],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });

    // Watch for discount percentage changes
    this.itemForm.get('discountPercentage')?.valueChanges.subscribe(percentage => {
      this.calculateDiscountedPrice(percentage);
    });

    // Watch for price changes
    this.itemForm.get('price')?.valueChanges.subscribe(() => {
      const percentage = this.itemForm.get('discountPercentage')?.value;
      if (percentage > 0) {
        this.calculateDiscountedPrice(percentage);
      }
    });

    // Watch for category changes
    this.itemForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.loadSubcategories(categoryId);
        this.itemForm.patchValue({ subcategoryId: '' });
      } else {
        this.subcategories = [];
      }
    });
  }

  calculateDiscountedPrice(percentage: number) {
    const price = this.itemForm.get('price')?.value;
    if (price && percentage > 0) {
      const discountedPrice = price - (price * percentage / 100);
      this.itemForm.patchValue({ discountedPrice: Math.round(discountedPrice * 100) / 100 });
    } else {
      this.itemForm.patchValue({ discountedPrice: '' });
    }
  }

  loadCategories() {
    this.isLoadingCategories = true;

    this.categoryService.getCategories(true, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingCategories = false;
          if (response.success && response.data) {
            this.categories = response.data.filter(cat => cat.isActive);
          }
        },
        error: (error) => {
          this.isLoadingCategories = false;
          this.errorMessage = 'Failed to load categories';
          console.error('Load categories error:', error);
        }
      });
  }

  loadSubcategories(categoryId: number) {
    this.isLoadingSubcategories = true;

    this.subcategoryService.getSubcategories(categoryId, true, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingSubcategories = false;
          if (response.success && response.data) {
            this.subcategories = response.data.filter(sub => sub.isActive);
          }
        },
        error: (error) => {
          this.isLoadingSubcategories = false;
          console.error('Load subcategories error:', error);
          this.subcategories = [];
        }
      });
  }

  loadMenuItems() {
    this.isLoading = true;
    this.clearMessages();

    this.menuItemService.getMenuItems(
      this.filterCategoryId,
      this.filterSubcategoryId,
      this.filterActive,
      this.filterIsPromotion,
      this.filterAvailabilityStatus,
      this.currentPage,
      this.pageSize,
      this.searchTerm
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.menuItems = response.data;
          this.totalCount = response.totalCount || 0;
          this.totalPages = response.totalPages || 0;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load menu items';
        console.error('Load menu items error:', error);
      }
    });
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFiles = files;
      this.previewImages = [];
      
      // Create preview images
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.previewImages.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }
// Add this method to your MenuItemComponent class

getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-success';
    case 'out_of_stock':
      return 'bg-danger';
    case 'limited':
      return 'bg-warning';
    default:
      return 'bg-secondary';
  }
}

  removePreviewImage(index: number) {
    this.previewImages.splice(index, 1);
    // Note: This doesn't remove from selectedFiles - you'd need more complex logic for that
  }

  onSubmit() {
    if (this.itemForm.invalid) {
      this.markFormGroupTouched(this.itemForm);
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const formValue = this.itemForm.value;
    
    // Parse nutritional info if provided
    let nutritionalInfo = undefined;
    if (formValue.nutritionalInfo) {
      try {
        nutritionalInfo = JSON.parse(formValue.nutritionalInfo);
      } catch (e) {
        // If not valid JSON, treat as simple text
        nutritionalInfo = { notes: formValue.nutritionalInfo };
      }
    }

    const itemData: MenuItemRequest = {
      categoryId: parseInt(formValue.categoryId),
      subcategoryId: formValue.subcategoryId ? parseInt(formValue.subcategoryId) : undefined,
      itemName: formValue.itemName,
      description: formValue.description,
      price: parseFloat(formValue.price),
      discountedPrice: formValue.discountedPrice ? parseFloat(formValue.discountedPrice) : undefined,
      discountPercentage: parseInt(formValue.discountPercentage),
      isPromotion: formValue.isPromotion,
      promotionLabel: formValue.promotionLabel,
      ingredients: formValue.ingredients,
      allergenInfo: formValue.allergenInfo,
      nutritionalInfo: nutritionalInfo,
      isVegetarian: formValue.isVegetarian,
      isVegan: formValue.isVegan,
      isSpicy: formValue.isSpicy,
      spiceLevel: parseInt(formValue.spiceLevel),
      preparationTime: parseInt(formValue.preparationTime),
      availabilityStatus: formValue.availabilityStatus,
      displayOrder: parseInt(formValue.displayOrder),
      isActive: formValue.isActive
    };

    const apiCall = this.editingItemId 
      ? this.menuItemService.updateMenuItem(this.editingItemId, itemData, this.selectedFiles || undefined)
      : this.menuItemService.createMenuItem(itemData, this.selectedFiles || undefined);

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = this.editingItemId 
            ? `Menu item "${itemData.itemName}" updated successfully!`
            : `Menu item "${itemData.itemName}" created successfully!`;
          this.resetForm();
          this.loadMenuItems();
        } else {
          this.errorMessage = response.message || 'Failed to save menu item';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to save menu item';
        console.error('Save menu item error:', error);
      }
    });
  }

  editMenuItem(item: MenuItemResponse) {
    this.editingItemId = item.itemId;
    
    // Load subcategories for the item's category first
    if (item.subcategoryId) {
      this.loadSubcategories(item.categoryId);
    }
    
    this.itemForm.patchValue({
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      itemName: item.itemName,
      description: item.description,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountPercentage: item.discountPercentage,
      isPromotion: item.isPromotion,
      promotionLabel: item.promotionLabel,
      ingredients: item.ingredients,
      allergenInfo: item.allergenInfo,
      nutritionalInfo: item.nutritionalInfo ? JSON.stringify(item.nutritionalInfo) : '',
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isSpicy: item.isSpicy,
      spiceLevel: item.spiceLevel,
      preparationTime: item.preparationTime,
      availabilityStatus: item.availabilityStatus,
      displayOrder: item.displayOrder,
      isActive: item.isActive
    });

    // Show existing images in preview
    this.previewImages = [...item.images];
    this.selectedFiles = null;

    // Scroll to form
    document.querySelector('.item-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteMenuItem(item: MenuItemResponse) {
    const confirmMessage = `Are you sure you want to delete menu item "${item.itemName}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.menuItemService.deleteMenuItem(item.itemId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = `Menu item "${item.itemName}" deleted successfully!`;
              this.loadMenuItems();
            } else {
              this.errorMessage = response.message || 'Failed to delete menu item';
            }
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Failed to delete menu item';
            console.error('Delete menu item error:', error);
          }
        });
    }
  }

  toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  resetForm() {
    this.itemForm.reset();
    this.itemForm.patchValue({ 
      isActive: true, 
      displayOrder: 0,
      discountPercentage: 0,
      spiceLevel: 0,
      preparationTime: 0,
      availabilityStatus: 'available'
    });
    this.editingItemId = null;
    this.selectedFiles = null;
    this.previewImages = [];
    this.showAdvancedOptions = false;
    this.clearMessages();
  }

  onSearch() {
    this.currentPage = 1;
    this.loadMenuItems();
  }

  onCategoryFilterChange() {
    this.filterSubcategoryId = undefined;
    this.currentPage = 1;
    this.loadMenuItems();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadMenuItems();
  }

  getPaginationNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
  getFullImageUrl(imagePath: string): string {
  
  // Prepend API URL
  debugger;
  return `${this.menuItemService.baseUrl}/${imagePath}`;
}

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.categoryId === categoryId);
    return category ? category.categoryName : '';
  }

  getSubcategoryName(subcategoryId: number): string {
    const subcategory = this.subcategories.find(sub => sub.subcategoryId === subcategoryId);
    return subcategory ? subcategory.subcategoryName : '';
  }

  getAvailabilityStatusLabel(status: string): string {
    const statusOption = this.availabilityStatuses.find(s => s.value === status);
    return statusOption ? statusOption.label : status;
  }

  getSpiceLevelLabel(level: number): string {
    const spiceOption = this.spiceLevels.find(s => s.value === level);
    return spiceOption ? spiceOption.label : level.toString();
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  trackByItemId(index: number, item: MenuItemResponse): number {
    return item.itemId;
  }

  trackByCategoryId(index: number, category: MenuCategoryResponse): number {
    return category.categoryId;
  }

  trackBySubcategoryId(index: number, subcategory: MenuSubcategoryResponse): number {
    return subcategory.subcategoryId;
  }
  
}
