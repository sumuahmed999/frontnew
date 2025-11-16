import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuCategoryRequest, MenuCategoryResponse, MenuCategoryService } from '../../../service/menu-category.service';

@Component({
  selector: 'app-menu-category',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './menu-category.component.html',
  styleUrl: './menu-category.component.scss'
})
export class MenuCategoryComponent implements OnInit, OnDestroy {
  categoryForm!: FormGroup;
  categories: MenuCategoryResponse[] = [];
  
  // Loading states
  isLoading = false;
  isSubmitting = false;
  
  // UI state
  successMessage = '';
  errorMessage = '';
  editingCategoryId: number | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  searchTerm = '';
  filterActive?: boolean;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private categoryService: MenuCategoryService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadCategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm() {
    this.categoryForm = this.fb.group({
      categoryName: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  loadCategories() {
    this.isLoading = true;
    this.clearMessages();

    this.categoryService.getCategories(
      this.filterActive,
      this.currentPage,
      this.pageSize,
      this.searchTerm
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.categories = response.data;
          this.totalCount = response.totalCount || 0;
          this.totalPages = response.totalPages || 0;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load categories';
        console.error('Load categories error:', error);
      }
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const categoryData: MenuCategoryRequest = this.categoryForm.value;

    const apiCall = this.editingCategoryId 
      ? this.categoryService.updateCategory(this.editingCategoryId, categoryData)
      : this.categoryService.createCategory(categoryData);

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = this.editingCategoryId 
            ? `Category "${categoryData.categoryName}" updated successfully!`
            : `Category "${categoryData.categoryName}" created successfully!`;
          this.resetForm();
          this.loadCategories();
        } else {
          this.errorMessage = response.message || 'Failed to save category';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to save category';
        console.error('Save category error:', error);
      }
    });
  }

  editCategory(category: MenuCategoryResponse) {
    this.editingCategoryId = category.categoryId;
    this.categoryForm.patchValue({
      categoryName: category.categoryName,
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive
    });

    // Scroll to form
    document.querySelector('.category-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteCategory(category: MenuCategoryResponse) {
    if (category.itemCount > 0 || category.subcategoryCount > 0) {
      this.errorMessage = 'Cannot delete category with items or subcategories';
      return;
    }

    const confirmMessage = `Are you sure you want to delete category "${category.categoryName}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.categoryService.deleteCategory(category.categoryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = `Category "${category.categoryName}" deleted successfully!`;
              this.loadCategories();
            } else {
              this.errorMessage = response.message || 'Failed to delete category';
            }
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Failed to delete category';
            console.error('Delete category error:', error);
          }
        });
    }
  }

  resetForm() {
    this.categoryForm.reset();
    this.categoryForm.patchValue({ isActive: true, displayOrder: 0 });
    this.editingCategoryId = null;
    this.clearMessages();
  }

  onSearch() {
    this.currentPage = 1;
    this.loadCategories();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadCategories();
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

  trackByCategoryId(index: number, category: MenuCategoryResponse): number {
    return category.categoryId;
  }
}
