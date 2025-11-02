import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout.component';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuItem } from 'primeng/api';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  status: string;
}

@Component({
  selector: 'app-primeng-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardLayoutComponent,
    ButtonModule,
    CardModule,
    InputTextModule,
    FloatLabelModule,
    PasswordModule,
    CheckboxModule,
    RadioButtonModule,
    SelectModule,
    TextareaModule,
    DrawerModule,
    MenuModule,
    AvatarModule,
    BadgeModule,
    ChipModule,
    TagModule,
    MessageModule,
    ToastModule,
    TableModule,
    PaginatorModule,
    DialogModule,
    ConfirmDialogModule,
  ],
  templateUrl: './primeng-demo.component.html',
  styleUrls: ['./primeng-demo.component.scss']
})
export class PrimeNGDemoComponent {
  // Form fields
  username = '';
  email = '';
  password = '';
  description = '';
  agreeTerms = false;
  selectedOption = '';
  selectedCity = signal<any>(null);

  // Drawer
  drawerVisible = signal(false);

  // Dialog
  dialogVisible = signal(false);

  // Menu items
  menuItems = signal<MenuItem[]>([
    {
      label: 'File',
      icon: 'pi pi-file',
      items: [
        { label: 'New', icon: 'pi pi-plus' },
        { label: 'Open', icon: 'pi pi-folder-open' },
        { label: 'Save', icon: 'pi pi-save' }
      ]
    },
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      items: [
        { label: 'Copy', icon: 'pi pi-copy' },
        { label: 'Paste', icon: 'pi pi-clipboard' }
      ]
    }
  ]);

  // Select options
  cities = [
    { name: 'New York', code: 'NY' },
    { name: 'Rome', code: 'RM' },
    { name: 'London', code: 'LDN' },
    { name: 'Paris', code: 'PRS' }
  ];

  // Table data
  products = signal<Product[]>([
    { id: '1', name: 'Laptop', category: 'Electronics', price: 999, quantity: 5, status: 'In Stock' },
    { id: '2', name: 'Mouse', category: 'Electronics', price: 29, quantity: 15, status: 'In Stock' },
    { id: '3', name: 'Keyboard', category: 'Electronics', price: 79, quantity: 0, status: 'Out of Stock' },
    { id: '4', name: 'Monitor', category: 'Electronics', price: 299, quantity: 8, status: 'In Stock' },
    { id: '5', name: 'Headphones', category: 'Audio', price: 149, quantity: 3, status: 'Low Stock' },
  ]);

  onSubmit() {
    console.log('Form submitted:', {
      username: this.username,
      email: this.email,
      password: this.password,
      description: this.description,
      agreeTerms: this.agreeTerms,
      selectedOption: this.selectedOption,
      selectedCity: this.selectedCity()
    });
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (status) {
      case 'In Stock':
        return 'success';
      case 'Low Stock':
        return 'warn';
      case 'Out of Stock':
        return 'danger';
      default:
        return 'info';
    }
  }
}

