// Supabase Configuration
const SUPABASE_URL = 'https://jantbnwrzeyvfblschct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphbnRibndyemV5dmZibHNjaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTk3OTEsImV4cCI6MjA4NDc3NTc5MX0.qGMiXRyBusIdmf-CSx8ohVWLFXFi7tVYY91rzmsMfrI';

let supabaseClient = null;

// Country codes
const countries = [
    { name: 'United States', flag: '🇺🇸', dialCode: '+1', code: 'US' },
    { name: 'Canada', flag: '🇨🇦', dialCode: '+1', code: 'CA' },
    { name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', code: 'GB' },
    { name: 'Australia', flag: '🇦🇺', dialCode: '+61', code: 'AU' },
    { name: 'Germany', flag: '🇩🇪', dialCode: '+49', code: 'DE' },
    { name: 'France', flag: '🇫🇷', dialCode: '+33', code: 'FR' },
    { name: 'Italy', flag: '🇮🇹', dialCode: '+39', code: 'IT' },
    { name: 'Spain', flag: '🇪🇸', dialCode: '+34', code: 'ES' },
    { name: 'Mexico', flag: '🇲🇽', dialCode: '+52', code: 'MX' },
    { name: 'Brazil', flag: '🇧🇷', dialCode: '+55', code: 'BR' },
    { name: 'Japan', flag: '🇯🇵', dialCode: '+81', code: 'JP' },
    { name: 'South Korea', flag: '🇰🇷', dialCode: '+82', code: 'KR' },
    { name: 'China', flag: '🇨🇳', dialCode: '+86', code: 'CN' },
    { name: 'India', flag: '🇮🇳', dialCode: '+91', code: 'IN' },
].sort((a, b) => a.name.localeCompare(b.name));

// State
let selectedCountry = countries.find(c => c.code === 'US');
let phoneNumber = '';
let fullPhoneNumber = '';
let referralCode = '';
let countdownInterval = null;
let userId = null;

// DOM Elements (initialized in init())
let phoneStep, otpStep, nameStep, successStep;
let phoneInput, otpInput, firstNameInput, lastNameInput;
let requestCodeBtn, verifyCodeBtn, continueNameBtn;
let phoneError, otpError, nameError;
let dialCodeEl, phoneDisplayEl, countdownEl, resendText, resendBtn, userNameEl;
let countryPicker, countryModal, countryList;

// Initialize
function init() {
    console.log('Crema: Initializing...');
    
    try {
        // Initialize Supabase
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Crema: Supabase initialized');
        } else {
            console.error('Crema: Supabase library not loaded');
        }
        
        // Get DOM elements
        phoneStep = document.getElementById('phone-step');
        otpStep = document.getElementById('otp-step');
        nameStep = document.getElementById('name-step');
        successStep = document.getElementById('success-step');
        
        phoneInput = document.getElementById('phone-input');
        otpInput = document.getElementById('otp-input');
        firstNameInput = document.getElementById('first-name-input');
        lastNameInput = document.getElementById('last-name-input');
        
        requestCodeBtn = document.getElementById('request-code-btn');
        verifyCodeBtn = document.getElementById('verify-code-btn');
        continueNameBtn = document.getElementById('continue-name-btn');
        
        phoneError = document.getElementById('phone-error');
        otpError = document.getElementById('otp-error');
        nameError = document.getElementById('name-error');
        
        dialCodeEl = document.getElementById('dial-code');
        phoneDisplayEl = document.getElementById('phone-display');
        countdownEl = document.getElementById('countdown');
        resendText = document.getElementById('resend-text');
        resendBtn = document.getElementById('resend-btn');
        userNameEl = document.getElementById('user-name');
        
        countryPicker = document.getElementById('country-picker');
        countryModal = document.getElementById('country-modal');
        countryList = document.getElementById('country-list');
        
        console.log('Crema: DOM elements loaded', { phoneInput, requestCodeBtn, countryPicker });
        
        // Get referral code from URL
        const urlParams = new URLSearchParams(window.location.search);
        referralCode = urlParams.get('ref') || '';
        
        // Build country list
        buildCountryList();
        
        // Event listeners
        if (phoneInput) {
            phoneInput.addEventListener('input', handlePhoneInput);
            console.log('Crema: Phone input listener added');
        }
        if (otpInput) otpInput.addEventListener('input', handleOtpInput);
        if (firstNameInput) firstNameInput.addEventListener('input', handleNameInput);
        if (lastNameInput) lastNameInput.addEventListener('input', handleNameInput);
        
        if (requestCodeBtn) requestCodeBtn.addEventListener('click', handleRequestCode);
        if (verifyCodeBtn) verifyCodeBtn.addEventListener('click', handleVerifyCode);
        if (continueNameBtn) continueNameBtn.addEventListener('click', handleContinueName);
        if (resendBtn) resendBtn.addEventListener('click', handleResendCode);
        
        if (countryPicker) {
            countryPicker.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Crema: Country picker clicked');
                countryModal.classList.add('active');
            });
            console.log('Crema: Country picker listener added');
        }
        
        if (countryModal) {
            countryModal.addEventListener('click', (e) => {
                if (e.target === countryModal) countryModal.classList.remove('active');
            });
        }
        
        const androidBtn = document.getElementById('android-waitlist-btn');
        if (androidBtn) {
            androidBtn.addEventListener('click', () => {
                window.open('https://forms.gle/crema-android-waitlist', '_blank');
            });
        }
        
        console.log('Crema: Initialization complete');
    } catch (error) {
        console.error('Crema: Initialization error', error);
    }
}

function buildCountryList() {
    countryList.innerHTML = countries.map(country => `
        <div class="country-item" data-code="${country.code}">
            <span class="flag">${country.flag}</span>
            <span class="name">${country.name} ${country.dialCode}</span>
        </div>
    `).join('');
    
    countryList.querySelectorAll('.country-item').forEach(item => {
        item.addEventListener('click', () => {
            const code = item.dataset.code;
            selectedCountry = countries.find(c => c.code === code);
            dialCodeEl.textContent = selectedCountry.dialCode;
            countryModal.classList.remove('active');
        });
    });
}

function formatPhoneNumber(input) {
    const digits = input.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
        if (i === 3 || i === 6) formatted += '-';
        formatted += digits[i];
    }
    return formatted;
}

function handlePhoneInput(e) {
    const formatted = formatPhoneNumber(e.target.value);
    e.target.value = formatted;
    phoneNumber = formatted;
    
    const digits = formatted.replace(/\D/g, '');
    const shouldEnable = digits.length >= 10;
    console.log('Crema: Phone input', { digits: digits.length, shouldEnable });
    
    if (requestCodeBtn) {
        requestCodeBtn.disabled = !shouldEnable;
    }
    if (phoneError) {
        phoneError.textContent = '';
    }
}

function handleOtpInput(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    e.target.value = digits;
    verifyCodeBtn.disabled = digits.length < 6;
    otpError.textContent = '';
    
    // Auto-verify when 6 digits entered
    if (digits.length === 6) {
        handleVerifyCode();
    }
}

function handleNameInput() {
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    continueNameBtn.disabled = !firstName || !lastName;
    nameError.textContent = '';
}

async function handleRequestCode() {
    const digits = phoneNumber.replace(/\D/g, '');
    fullPhoneNumber = selectedCountry.dialCode + digits;
    
    requestCodeBtn.classList.add('loading');
    requestCodeBtn.disabled = true;
    phoneError.textContent = '';
    
    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            phone: fullPhoneNumber
        });
        
        if (error) throw error;
        
        // Move to OTP step
        showStep('otp');
        phoneDisplayEl.textContent = fullPhoneNumber;
        startCountdown();
        otpInput.focus();
        
    } catch (error) {
        phoneError.textContent = error.message || 'Failed to send code. Please try again.';
    } finally {
        requestCodeBtn.classList.remove('loading');
        requestCodeBtn.disabled = false;
    }
}

async function handleVerifyCode() {
    const otp = otpInput.value;
    
    verifyCodeBtn.classList.add('loading');
    verifyCodeBtn.disabled = true;
    otpError.textContent = '';
    
    try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
            phone: fullPhoneNumber,
            token: otp,
            type: 'sms'
        });
        
        if (error) throw error;
        
        userId = data.user.id;
        
        // Check if user already exists (has name)
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, invited_by')
            .eq('id', userId)
            .single();
        
        if (profile && (profile.first_name || profile.invited_by)) {
            // Existing user - go to success
            userNameEl.textContent = profile.first_name || 'Friend';
            showStep('success');
        } else {
            // New user - need name and use referral code
            if (referralCode) {
                await useReferralCode();
            }
            showStep('name');
            firstNameInput.focus();
        }
        
    } catch (error) {
        otpError.textContent = error.message || 'Invalid code. Please try again.';
    } finally {
        verifyCodeBtn.classList.remove('loading');
        verifyCodeBtn.disabled = false;
    }
}

async function useReferralCode() {
    if (!referralCode || !userId) return;
    
    try {
        // Validate and use the referral code
        await supabaseClient.rpc('use_referral_code', {
            p_invitee_id: userId,
            p_referral_code: referralCode.toUpperCase()
        });
    } catch (error) {
        console.error('Failed to use referral code:', error);
    }
}

async function handleContinueName() {
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    
    continueNameBtn.classList.add('loading');
    continueNameBtn.disabled = true;
    nameError.textContent = '';
    
    try {
        // Update profile with name
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName
            })
            .eq('id', userId);
        
        if (error) throw error;
        
        userNameEl.textContent = firstName;
        showStep('success');
        
    } catch (error) {
        nameError.textContent = error.message || 'Failed to save. Please try again.';
    } finally {
        continueNameBtn.classList.remove('loading');
        continueNameBtn.disabled = false;
    }
}

async function handleResendCode() {
    resendBtn.style.display = 'none';
    resendText.style.display = 'block';
    
    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            phone: fullPhoneNumber
        });
        
        if (error) throw error;
        
        startCountdown();
        
    } catch (error) {
        otpError.textContent = error.message || 'Failed to resend code.';
        resendBtn.style.display = 'block';
        resendText.style.display = 'none';
    }
}

function startCountdown() {
    let seconds = 60;
    countdownEl.textContent = seconds;
    resendText.style.display = 'block';
    resendBtn.style.display = 'none';
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            resendText.style.display = 'none';
            resendBtn.style.display = 'block';
        }
    }, 1000);
}

function showStep(step) {
    [phoneStep, otpStep, nameStep, successStep].forEach(el => el.classList.remove('active'));
    
    switch (step) {
        case 'phone':
            phoneStep.classList.add('active');
            break;
        case 'otp':
            otpStep.classList.add('active');
            break;
        case 'name':
            nameStep.classList.add('active');
            break;
        case 'success':
            successStep.classList.add('active');
            break;
    }
}

// Handle keyboard visibility - move buttons above keyboard
function setupKeyboardHandler() {
    const bottomButtons = document.querySelectorAll('.bottom-button');
    
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const viewportHeight = window.visualViewport.height;
            const windowHeight = window.innerHeight;
            const keyboardHeight = windowHeight - viewportHeight;
            
            bottomButtons.forEach(btn => {
                if (keyboardHeight > 100) {
                    // Keyboard is open
                    btn.style.bottom = `${keyboardHeight}px`;
                } else {
                    // Keyboard is closed
                    btn.style.bottom = '0';
                }
            });
        });
        
        window.visualViewport.addEventListener('scroll', () => {
            const bottomButtons = document.querySelectorAll('.bottom-button');
            bottomButtons.forEach(btn => {
                btn.style.bottom = `${window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop}px`;
            });
        });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupKeyboardHandler();
});
