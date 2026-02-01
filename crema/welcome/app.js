// Supabase Configuration
const SUPABASE_URL = 'https://jantbnwrzeyvfblschct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphbnRibndyemV5dmZibHNjaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTk3OTEsImV4cCI6MjA4NDc3NTc5MX0.qGMiXRyBusIdmf-CSx8ohVWLFXFi7tVYY91rzmsMfrI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// DOM Elements
const phoneStep = document.getElementById('phone-step');
const otpStep = document.getElementById('otp-step');
const nameStep = document.getElementById('name-step');
const successStep = document.getElementById('success-step');

const phoneInput = document.getElementById('phone-input');
const otpInput = document.getElementById('otp-input');
const firstNameInput = document.getElementById('first-name-input');
const lastNameInput = document.getElementById('last-name-input');

const requestCodeBtn = document.getElementById('request-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const continueNameBtn = document.getElementById('continue-name-btn');

const phoneError = document.getElementById('phone-error');
const otpError = document.getElementById('otp-error');
const nameError = document.getElementById('name-error');

const dialCodeEl = document.getElementById('dial-code');
const phoneDisplayEl = document.getElementById('phone-display');
const countdownEl = document.getElementById('countdown');
const resendText = document.getElementById('resend-text');
const resendBtn = document.getElementById('resend-btn');
const userNameEl = document.getElementById('user-name');

const countryPicker = document.getElementById('country-picker');
const countryModal = document.getElementById('country-modal');
const countryList = document.getElementById('country-list');

// Initialize
function init() {
    // Get referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    referralCode = urlParams.get('ref') || '';
    
    // Build country list
    buildCountryList();
    
    // Event listeners
    phoneInput.addEventListener('input', handlePhoneInput);
    otpInput.addEventListener('input', handleOtpInput);
    firstNameInput.addEventListener('input', handleNameInput);
    lastNameInput.addEventListener('input', handleNameInput);
    
    requestCodeBtn.addEventListener('click', handleRequestCode);
    verifyCodeBtn.addEventListener('click', handleVerifyCode);
    continueNameBtn.addEventListener('click', handleContinueName);
    resendBtn.addEventListener('click', handleResendCode);
    
    countryPicker.addEventListener('click', () => countryModal.classList.add('active'));
    countryModal.addEventListener('click', (e) => {
        if (e.target === countryModal) countryModal.classList.remove('active');
    });
    
    document.getElementById('android-waitlist-btn').addEventListener('click', () => {
        window.open('https://forms.gle/crema-android-waitlist', '_blank');
    });
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
    requestCodeBtn.disabled = digits.length < 10;
    phoneError.textContent = '';
}

function handleOtpInput(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    e.target.value = digits;
    verifyCodeBtn.disabled = digits.length < 6;
    otpError.textContent = '';
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
        const { error } = await supabase.auth.signInWithOtp({
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
        const { data, error } = await supabase.auth.verifyOtp({
            phone: fullPhoneNumber,
            token: otp,
            type: 'sms'
        });
        
        if (error) throw error;
        
        userId = data.user.id;
        
        // Check if user already exists (has name)
        const { data: profile } = await supabase
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
        await supabase.rpc('use_referral_code', {
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
        const { error } = await supabase
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
        const { error } = await supabase.auth.signInWithOtp({
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

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
