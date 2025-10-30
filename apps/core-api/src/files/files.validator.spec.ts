import { BadRequestException } from '@nestjs/common';
import { FilesValidator } from './files.validator';
import { FILE_CONSTRAINTS } from '../common/constants/file-constraints';

describe('FilesValidator', () => {
  let validator: FilesValidator;

  beforeEach(() => {
    validator = new FilesValidator();
  });

  describe('validateFileSize', () => {
    it('should pass for valid file size', () => {
      expect(() => validator.validateFileSize(1024000)).not.toThrow();
    });

    it('should throw error for zero file size', () => {
      expect(() => validator.validateFileSize(0)).toThrow(BadRequestException);
      expect(() => validator.validateFileSize(0)).toThrow(
        'File size must be greater than 0',
      );
    });

    it('should throw error for negative file size', () => {
      expect(() => validator.validateFileSize(-100)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for file size exceeding limit', () => {
      const oversizedFile = FILE_CONSTRAINTS.MAX_FILE_SIZE + 1;
      expect(() => validator.validateFileSize(oversizedFile)).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateFileSize(oversizedFile)).toThrow(
        /File size exceeds maximum/,
      );
    });
  });

  describe('validateMimeType', () => {
    it('should pass for allowed image mime types', () => {
      expect(() => validator.validateMimeType('image/jpeg')).not.toThrow();
      expect(() => validator.validateMimeType('image/png')).not.toThrow();
      expect(() => validator.validateMimeType('image/gif')).not.toThrow();
    });

    it('should pass for allowed document mime types', () => {
      expect(() => validator.validateMimeType('application/pdf')).not.toThrow();
      expect(() =>
        validator.validateMimeType('application/msword'),
      ).not.toThrow();
    });

    it('should throw error for disallowed mime types', () => {
      expect(() => validator.validateMimeType('application/exe')).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateMimeType('video/mp4')).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateMimeType('text/html')).toThrow(
        BadRequestException,
      );
    });

    it('should throw error with descriptive message', () => {
      expect(() => validator.validateMimeType('invalid/type')).toThrow(
        /File type not supported/,
      );
    });
  });

  describe('validateService', () => {
    it('should pass for valid services', () => {
      expect(() => validator.validateService('notes')).not.toThrow();
      expect(() => validator.validateService('kanban')).not.toThrow();
      expect(() => validator.validateService('forms')).not.toThrow();
    });

    it('should throw error for invalid service', () => {
      expect(() => validator.validateService('invalid')).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateService('other')).toThrow(
        BadRequestException,
      );
    });

    it('should throw error with list of valid services', () => {
      expect(() => validator.validateService('invalid')).toThrow(
        /Must be: notes, kanban, forms/,
      );
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize file name with special characters', () => {
      const result = validator.sanitizeFileName('test file @#$.pdf');
      expect(result).toBe('test_file____.pdf');
    });

    it('should remove path traversal attempts', () => {
      const result = validator.sanitizeFileName('../../etc/passwd');
      expect(result).toBe('passwd');
    });

    it('should handle windows paths', () => {
      const result = validator.sanitizeFileName('C:\\Windows\\file.txt');
      expect(result).toBe('file.txt');
    });

    it('should preserve dots, dashes, and underscores', () => {
      const result = validator.sanitizeFileName('my-file_name.test.pdf');
      expect(result).toBe('my-file_name.test.pdf');
    });

    it('should limit filename length to 200 characters', () => {
      const longName = 'a'.repeat(250) + '.pdf';
      const result = validator.sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('validateFile', () => {
    it('should validate and sanitize valid file', () => {
      const result = validator.validateFile(
        'test document.pdf',
        1024000,
        'application/pdf',
        'notes',
      );
      expect(result).toBe('test_document.pdf');
    });

    it('should throw error for invalid file size', () => {
      expect(() =>
        validator.validateFile('test.pdf', 0, 'application/pdf', 'notes'),
      ).toThrow(BadRequestException);
    });

    it('should throw error for invalid mime type', () => {
      expect(() =>
        validator.validateFile('test.exe', 1024000, 'application/exe', 'notes'),
      ).toThrow(BadRequestException);
    });

    it('should throw error for invalid service', () => {
      expect(() =>
        validator.validateFile(
          'test.pdf',
          1024000,
          'application/pdf',
          'invalid',
        ),
      ).toThrow(BadRequestException);
    });
  });
});
