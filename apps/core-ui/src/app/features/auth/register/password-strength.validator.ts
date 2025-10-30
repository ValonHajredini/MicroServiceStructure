import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumberOrSpecial = /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value);

    const valid = hasMinLength && hasUpperCase && hasLowerCase && hasNumberOrSpecial;
    return valid
      ? null
      : {
          passwordStrength: {
            hasMinLength,
            hasUpperCase,
            hasLowerCase,
            hasNumberOrSpecial,
          },
        };
  };
}
