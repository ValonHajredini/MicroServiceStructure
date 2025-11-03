import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskCard } from './task-card';
import { Task } from '../../models/board.model';
import { CdkDrag } from '@angular/cdk/drag-drop';

describe('TaskCard', () => {
  let component: TaskCard;
  let fixture: ComponentFixture<TaskCard>;

  const mockTask: Task = {
    id: 'task-1',
    column_id: 'col-1',
    title: 'Test Task',
    description: 'Test Description',
    position: 0,
    priority: 'high',
    assigned_to: 'Test User',
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCard, CdkDrag]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display task title', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.task-title')?.textContent).toContain('Test Task');
  });

  it('should display priority badge', () => {
    const compiled = fixture.nativeElement;
    const badge = compiled.querySelector('.priority-badge');
    expect(badge).toBeTruthy();
    expect(badge?.classList.contains('priority-high')).toBe(true);
  });

  it('should emit taskClicked when clicked', () => {
    spyOn(component.taskClicked, 'emit');
    const element = fixture.nativeElement.querySelector('.task-card');
    element.click();
    expect(component.taskClicked.emit).toHaveBeenCalledWith(mockTask);
  });

  it('should handle keyboard Enter key', () => {
    spyOn(component.taskClicked, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onKeyDown(event);
    expect(component.taskClicked.emit).toHaveBeenCalledWith(mockTask);
  });

  it('should not emit when loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    spyOn(component.taskClicked, 'emit');
    component.onTaskClick();
    expect(component.taskClicked.emit).not.toHaveBeenCalled();
  });

  it('should emit navigateUp on ArrowUp key', () => {
    spyOn(component.navigateUp, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onKeyDown(event);
    expect(component.navigateUp.emit).toHaveBeenCalled();
  });

  it('should emit navigateDown on ArrowDown key', () => {
    spyOn(component.navigateDown, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onKeyDown(event);
    expect(component.navigateDown.emit).toHaveBeenCalled();
  });

  it('should emit moveTaskUp on Shift+ArrowUp', () => {
    spyOn(component.moveTaskUp, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
    component.onKeyDown(event);
    expect(component.moveTaskUp.emit).toHaveBeenCalledWith(mockTask);
  });

  it('should emit moveTaskDown on Shift+ArrowDown', () => {
    spyOn(component.moveTaskDown, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true });
    component.onKeyDown(event);
    expect(component.moveTaskDown.emit).toHaveBeenCalledWith(mockTask);
  });
});
