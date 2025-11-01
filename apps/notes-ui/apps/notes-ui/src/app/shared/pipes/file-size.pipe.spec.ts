import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  let pipe: FileSizePipe;

  beforeEach(() => {
    pipe = new FileSizePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "0 Bytes" for 0', () => {
    expect(pipe.transform(0)).toBe('0 Bytes');
  });

  it('should format bytes correctly', () => {
    expect(pipe.transform(500)).toBe('500 Bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(pipe.transform(1024)).toBe('1 KB');
    expect(pipe.transform(2048)).toBe('2 KB');
    expect(pipe.transform(1536)).toBe('1.5 KB');
  });

  it('should format megabytes correctly', () => {
    expect(pipe.transform(1048576)).toBe('1 MB');
    expect(pipe.transform(2097152)).toBe('2 MB');
    expect(pipe.transform(2621440)).toBe('2.5 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(pipe.transform(1073741824)).toBe('1 GB');
    expect(pipe.transform(2147483648)).toBe('2 GB');
  });

  it('should round to 2 decimal places', () => {
    expect(pipe.transform(1234567)).toBe('1.18 MB');
  });
});
