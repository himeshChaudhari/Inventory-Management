// js/validators.js - Shared Form Validation Helper

/**
 * Validates an Indian mobile phone number.
 * Must be exactly 10 digits and start with 6, 7, 8, or 9.
 */
function validatePhoneNumber(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return { valid: false, error: 'Phone number is required.' };
    }
    if (!/^[6-9]/.test(raw)) {
        return { valid: false, error: 'Phone number must start with 6, 7, 8 or 9.' };
    }
    if (!/^\d{10}$/.test(raw)) {
        return { valid: false, error: 'Phone number must be exactly 10 digits.' };
    }
    return { valid: true, error: '', clean: raw };
}

/**
 * Validates an email address.
 * Must conform to standard email format: name@domain.com (2+ letter TLD, no spaces).
 */
function validateEmail(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
        return { valid: false, error: 'Email address is required.' };
    }
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    if (!regex.test(raw)) {
        return { valid: false, error: 'Please enter a valid email address (example: name@gmail.com).' };
    }
    return { valid: true, error: '', clean: raw };
}

/**
 * Validates an image file.
 * Allowed formats: JPG, JPEG, PNG, WEBP. Max size: 2MB.
 */
function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'Please upload a product image.' };
    }
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedExtensions.includes(ext) || (file.type && !allowedMimes.includes(file.type))) {
        return { valid: false, error: 'Only JPG, JPEG, PNG, or WEBP images are allowed.' };
    }
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
        return { valid: false, error: 'Image file size must be 2MB or less.' };
    }
    return { valid: true, error: '' };
}

/**
 * Sets input state to invalid with error message.
 */
function setFieldError(inputEl, errorEl, message) {
    if (!inputEl) return;
    inputEl.classList.remove('is-valid');
    inputEl.classList.add('is-invalid');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Sets input state to valid and clears error message.
 */
function setFieldSuccess(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.classList.remove('is-invalid');
    inputEl.classList.add('is-valid');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

/**
 * Resets input state to neutral (neither valid nor invalid).
 */
function setFieldNeutral(inputEl, errorEl) {
    if (!inputEl) return;
    inputEl.classList.remove('is-invalid', 'is-valid');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

/**
 * Attaches real-time formatting & validation to a phone number field.
 */
function attachPhoneValidator(inputEl, errorEl, onStatusChange) {
    if (!inputEl) return;
    inputEl.setAttribute('inputmode', 'numeric');
    inputEl.setAttribute('maxlength', '10');

    inputEl.addEventListener('input', () => {
        // Strip non-digits and cap at 10 digits
        const digits = inputEl.value.replace(/\D/g, '').slice(0, 10);
        if (inputEl.value !== digits) {
            inputEl.value = digits;
        }

        if (inputEl.value.length === 0) {
            setFieldNeutral(inputEl, errorEl);
        } else if (!/^[6-9]/.test(inputEl.value)) {
            setFieldError(inputEl, errorEl, 'Phone number must start with 6, 7, 8 or 9.');
        } else if (inputEl.value.length === 10) {
            setFieldSuccess(inputEl, errorEl);
        } else {
            // Typing in progress, clear error if starting digit is valid
            setFieldNeutral(inputEl, errorEl);
        }
        if (typeof onStatusChange === 'function') onStatusChange();
    });

    inputEl.addEventListener('blur', () => {
        if (!inputEl.value) {
            setFieldNeutral(inputEl, errorEl);
            if (typeof onStatusChange === 'function') onStatusChange();
            return;
        }
        const res = validatePhoneNumber(inputEl.value);
        if (!res.valid) {
            setFieldError(inputEl, errorEl, res.error);
        } else {
            setFieldSuccess(inputEl, errorEl);
        }
        if (typeof onStatusChange === 'function') onStatusChange();
    });
}

/**
 * Attaches real-time validation to an email field.
 */
function attachEmailValidator(inputEl, errorEl, onStatusChange) {
    if (!inputEl) return;
    inputEl.setAttribute('type', 'email');

    inputEl.addEventListener('input', () => {
        if (inputEl.classList.contains('is-invalid')) {
            const res = validateEmail(inputEl.value);
            if (res.valid) {
                setFieldSuccess(inputEl, errorEl);
            }
        }
        if (typeof onStatusChange === 'function') onStatusChange();
    });

    inputEl.addEventListener('blur', () => {
        inputEl.value = inputEl.value.trim().toLowerCase();
        if (!inputEl.value) {
            setFieldNeutral(inputEl, errorEl);
            if (typeof onStatusChange === 'function') onStatusChange();
            return;
        }
        const res = validateEmail(inputEl.value);
        if (!res.valid) {
            setFieldError(inputEl, errorEl, res.error);
        } else {
            setFieldSuccess(inputEl, errorEl);
        }
        if (typeof onStatusChange === 'function') onStatusChange();
    });
}
