import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuSubcategoryRequest, MenuSubcategoryResponse, MenuSubcategoryService } from '../../../service/menu-subcategory.service';
import { MenuCategoryResponse, MenuCategoryService } from '../../../service/menu-category.service';

@Component({
  selector: 'app-menu-subcategory',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './menu-subcategory.component.html',
  styleUrl: './menu-subcategory.component.scss'
})
export class MenuSubcategoryComponent implements OnInit, OnDestroy {
  subcategoryForm!: FormGroup;
  subcategories: MenuSubcategoryResponse[] = [];
  categories: MenuCategoryResponse[] = [];
  
  // Loading states
  isLoading = false;
  isLoadingCategories = false;
  isSubmitting = false;
  
  // UI state
  successMessage = '';
  errorMessage = '';
  editingSubcategoryId: number | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  searchTerm = '';
  filterActive?: boolean;
  filterCategoryId?: number;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private subcategoryService: MenuSubcategoryService,
    private categoryService: MenuCategoryService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadCategories();
    this.loadSubcategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm() {
    this.subcategoryForm = this.fb.group({
      categoryId: ['', Validators.required],
      subcategoryName: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  loadCategories() {
    this.isLoadingCategories = true;

    this.categoryService.getCategories(true, 1, 100) // Get all active categories
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

  loadSubcategories() {
    this.isLoading = true;
    this.clearMessages();

    this.subcategoryService.getSubcategories(
      this.filterCategoryId,
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
          this.subcategories = response.data;
          this.totalCount = response.totalCount || 0;
          this.totalPages = response.totalPages || 0;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load subcategories';
        console.error('Load subcategories error:', error);
      }
    });
  }

  onSubmit() {
    if (this.subcategoryForm.invalid) {
      this.markFormGroupTouched(this.subcategoryForm);
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const subcategoryData: MenuSubcategoryRequest = this.subcategoryForm.value;

    const apiCall = this.editingSubcategoryId 
      ? this.subcategoryService.updateSubcategory(this.editingSubcategoryId, subcategoryData)
      : this.subcategoryService.createSubcategory(subcategoryData);

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = this.editingSubcategoryId 
            ? `Subcategory "${subcategoryData.subcategoryName}" updated successfully!`
            : `Subcategory "${subcategoryData.subcategoryName}" created successfully!`;
          this.resetForm();
          this.loadSubcategories();
        } else {
          this.errorMessage = response.message || 'Failed to save subcategory';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Failed to save subcategory';
        console.error('Save subcategory error:', error);
      }
    });
  }

  editSubcategory(subcategory: MenuSubcategoryResponse) {
    this.editingSubcategoryId = subcategory.subcategoryId;
    this.subcategoryForm.patchValue({
      categoryId: subcategory.categoryId,
      subcategoryName: subcategory.subcategoryName,
      description: subcategory.description,
      displayOrder: subcategory.displayOrder,
      isActive: subcategory.isActive
    });

    // Scroll to form
    document.querySelector('.subcategory-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteSubcategory(subcategory: MenuSubcategoryResponse) {
    if (subcategory.itemCount > 0) {
      this.errorMessage = 'Cannot delete subcategory with menu items';
      return;
    }

    const confirmMessage = `Are you sure you want to delete subcategory "${subcategory.subcategoryName}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.subcategoryService.deleteSubcategory(subcategory.subcategoryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.successMessage = `Subcategory "${subcategory.subcategoryName}" deleted successfully!`;
              this.loadSubcategories();
            } else {
              this.errorMessage = response.message || 'Failed to delete subcategory';
            }
          },
          error: (error) => {
            this.errorMessage = error.error?.message || 'Failed to delete subcategory';
            console.error('Delete subcategory error:', error);
          }
        });
    }
  }

  resetForm() {
    this.subcategoryForm.reset();
    this.subcategoryForm.patchValue({ isActive: true, displayOrder: 0 });
    this.editingSubcategoryId = null;
    this.clearMessages();
  }

  onSearch() {
    this.currentPage = 1;
    this.loadSubcategories();
  }

  onCategoryFilterChange() {
    this.currentPage = 1;
    this.loadSubcategories();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.loadSubcategories();
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

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.categoryId === categoryId);
    return category ? category.categoryName : '';
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

  trackBySubcategoryId(index: number, subcategory: MenuSubcategoryResponse): number {
    return subcategory.subcategoryId;
  }

  trackByCategoryId(index: number, category: MenuCategoryResponse): number {
    return category.categoryId;
  }
}
