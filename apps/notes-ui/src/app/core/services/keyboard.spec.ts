import { TestBed } from '@angular/core/testing';
import { KeyboardService } from './keyboard';

describe('KeyboardService', () => {
  let service: KeyboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KeyboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register shortcut', () => {
    const handler = jasmine.createSpy('handler');
    service.registerShortcut({
      key: 's',
      ctrl: true,
      description: 'Save',
      handler
    });

    const shortcuts = service.getAllShortcuts();
    expect(shortcuts.length).toBe(1);
    expect(shortcuts[0].description).toBe('Save');
  });

  it('should trigger registered shortcut', () => {
    const handler = jasmine.createSpy('handler');
    service.registerShortcut({
      key: 's',
      ctrl: true,
      description: 'Save',
      handler
    });

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    const result = service.handleKeyDown(event);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should not trigger unregistered shortcut', () => {
    const event = new KeyboardEvent('keydown', { key: 'x', ctrlKey: true });
    const result = service.handleKeyDown(event);

    expect(result).toBe(false);
  });
});
