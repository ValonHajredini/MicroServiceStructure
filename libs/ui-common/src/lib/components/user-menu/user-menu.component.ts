import { Component, Input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';

export type UserMenuButtonStyle = 'simple' | 'avatar';

@Component({
  selector: 'ui-user-menu',
  standalone: true,
  imports: [CommonModule, PopoverModule, ButtonModule, AvatarModule],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss']
})
export class UserMenuComponent {
  @Input() userEmail = '';
  @Input() userDisplayName = '';
  @Input() userInitials = '';
  @Input() menuItems: MenuItem[] = [];
  @Input() buttonStyle: UserMenuButtonStyle = 'simple';
  @Input() buttonClass = '';
  @Input() showShadow = false;

  // Internal signals for reactive template binding
  protected userEmailSignal = signal<string>('');
  protected userDisplayNameSignal = signal<string>('');
  protected userInitialsSignal = signal<string>('');
  protected menuItemsSignal = signal<MenuItem[]>([]);

  constructor() {
    // Update signals when inputs change
    effect(() => {
      this.userEmailSignal.set(this.userEmail);
      this.userDisplayNameSignal.set(this.userDisplayName);
      this.userInitialsSignal.set(this.userInitials);
      this.menuItemsSignal.set(this.menuItems);
    }, { allowSignalWrites: true });
  }

  ngOnChanges(): void {
    this.userEmailSignal.set(this.userEmail);
    this.userDisplayNameSignal.set(this.userDisplayName);
    this.userInitialsSignal.set(this.userInitials);
    this.menuItemsSignal.set(this.menuItems);
  }

  onMenuItemClick(item: MenuItem, overlayPanel: any): void {
    if (item.command) {
      item.command({ originalEvent: null, item });
    }
    overlayPanel.hide();
  }
}
