import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FoodOrderService {
  private cartItems = new BehaviorSubject<any[]>([]);
  private orderData = new BehaviorSubject<any>({});

  cartItems$ = this.cartItems.asObservable();
  orderData$ = this.orderData.asObservable();

  // Mock data
  mockStopOvers = [
    {
      id: 1,
      name: 'Highway Paradise Dhaba',
      arrivalTime: '14:30',
      stopDuration: 30,
      restaurantCount: 8,
      location: 'Rajpura, Punjab'
    },
    {
      id: 2,
      name: 'Food Junction Plaza',
      arrivalTime: '18:45',
      stopDuration: 45,
      restaurantCount: 12,
      location: 'Karnal, Haryana'
    }
  ];

  mockRestaurants = [
    {
      id: 1,
      name: 'Punjabi Zaika',
      cuisine: 'North Indian, Punjabi',
      rating: 4.3,
      deliveryTime: 15,
      priceRange: '₹₹',
      image: '/assets/restaurant1.jpg',
      isVeg: true,
      isFastFood: false,
      isRecommended: true
    },
    {
      id: 2,
      name: 'Quick Bites Express',
      cuisine: 'Fast Food, Snacks',
      rating: 4.1,
      deliveryTime: 8,
      priceRange: '₹',
      image: '/assets/restaurant2.jpg',
      isVeg: false,
      isFastFood: true,
      isRecommended: false
    }
  ];

  mockMenu = {
    categories: [
      {
        id: 'mains',
        name: 'Main Course',
        items: [
          {
            id: 1,
            name: 'Butter Chicken',
            description: 'Creamy tomato-based curry with tender chicken pieces',
            price: 280,
            isVeg: false,
            isSpicy: true,
            image: '/assets/butter-chicken.jpg'
          },
          {
            id: 2,
            name: 'Dal Makhani',
            description: 'Rich and creamy black lentils cooked overnight',
            price: 180,
            isVeg: true,
            isSpicy: false,
            image: '/assets/dal-makhani.jpg'
          }
        ]
      }
    ]
  };

  addToCart(item: any) {
    const currentCart = this.cartItems.value;
    const existingItem = currentCart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      currentCart.push({ ...item, quantity: 1 });
    }
    
    this.cartItems.next([...currentCart]);
  }

  removeFromCart(itemId: number) {
    const currentCart = this.cartItems.value;
    const updatedCart = currentCart.filter(item => item.id !== itemId);
    this.cartItems.next(updatedCart);
  }

  updateQuantity(itemId: number, quantity: number) {
    const currentCart = this.cartItems.value;
    const item = currentCart.find(cartItem => cartItem.id === itemId);
    
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(itemId);
      } else {
        item.quantity = quantity;
        this.cartItems.next([...currentCart]);
      }
    }
  }

  getCartTotal() {
    return this.cartItems.value.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  clearCart() {
    this.cartItems.next([]);
  }

  setOrderData(data: any) {
    this.orderData.next(data);
  }

  // Location service
  getCurrentLocation(): Promise<{latitude: number, longitude: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  // Mock API calls
  async sendOTP(mobileNumber: string): Promise<boolean> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`OTP sent to ${mobileNumber}`);
        resolve(true);
      }, 1000);
    });
  }

  async verifyOTP(otp: string): Promise<boolean> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        // For demo, accept any 4-digit OTP
        resolve(otp.length === 4);
      }, 1500);
    });
  }

  async placeOrder(orderData: any): Promise<string> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        const orderId = 'TFE' + Date.now().toString().slice(-6);
        resolve(orderId);
      }, 2000);
    });
  }
}
