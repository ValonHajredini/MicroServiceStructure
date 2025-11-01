import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    pipe = new RelativeTimePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "Just now" for times less than 60 seconds ago', () => {
    const now = new Date();
    const result = pipe.transform(now);
    expect(result).toBe('Just now');
  });

  it('should return minutes ago for times less than 1 hour', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = pipe.transform(fiveMinutesAgo);
    expect(result).toBe('5 minutes ago');
  });

  it('should return singular minute for 1 minute ago', () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const result = pipe.transform(oneMinuteAgo);
    expect(result).toBe('1 minute ago');
  });

  it('should return hours ago for times less than 24 hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = pipe.transform(twoHoursAgo);
    expect(result).toBe('2 hours ago');
  });

  it('should return "Yesterday" for 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = pipe.transform(oneDayAgo);
    expect(result).toBe('Yesterday');
  });

  it('should return days ago for times less than 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = pipe.transform(threeDaysAgo);
    expect(result).toBe('3 days ago');
  });

  it('should return formatted date for times 7+ days ago', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const result = pipe.transform(eightDaysAgo);
    expect(result).toBe(eightDaysAgo.toLocaleDateString());
  });

  it('should handle string dates', () => {
    const now = new Date().toISOString();
    const result = pipe.transform(now);
    expect(result).toBe('Just now');
  });
});
