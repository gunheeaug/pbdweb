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

// Interest tags (same as app)
const interestTags = [
    // Profession
    'Barista', 'Roaster', 'Pastry chef', 'Regular',
    // Coffee style
    'Espresso only', 'Pour-over fan', 'Cappuccino person', 'Specialty explorer',
    'Matcha lover', 'Tea person', 'Single-origin seeker', 'Cold brew addict',
    'Americano drinker', 'Light roast', 'Dark roast', 'Decaf',
    // Brew method
    'Aeropress fan', 'French press', 'V60 / Chemex',
    // Lifestyle
    'Weekend ritual', 'Morning person', 'Night owl', 'Team iced', 'Team hot',
    'Quiet corner seeker'
];

// State
let selectedCountry = countries.find(c => c.code === 'US');
let phoneNumber = '';
let fullPhoneNumber = '';
let referralCode = '';
let countdownInterval = null;
let userId = null;
let selectedInterests = [];
let userFirstName = '';

// DOM Elements (initialized in init())
let phoneStep, otpStep, referralStep, interestsStep, nameStep, bioStep, successStep;
let phoneInput, otpInput, referralInput, firstNameInput, lastNameInput, bioInput;
let requestCodeBtn, verifyCodeBtn, continueReferralBtn, continueInterestsBtn, skipInterestsBtn, continueNameBtn, continueBioBtn, skipBioBtn;
let phoneError, otpError, referralError, nameError;
let dialCodeEl, phoneDisplayEl, countdownEl, resendText, resendBtn, userNameEl, waitlistLink;
let countryPicker, countryModal, countryList, interestsGrid;

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
        referralStep = document.getElementById('referral-step');
        interestsStep = document.getElementById('interests-step');
        nameStep = document.getElementById('name-step');
        bioStep = document.getElementById('bio-step');
        successStep = document.getElementById('success-step');
        
        phoneInput = document.getElementById('phone-input');
        otpInput = document.getElementById('otp-input');
        referralInput = document.getElementById('referral-input');
        firstNameInput = document.getElementById('first-name-input');
        lastNameInput = document.getElementById('last-name-input');
        bioInput = document.getElementById('bio-input');
        
        requestCodeBtn = document.getElementById('request-code-btn');
        verifyCodeBtn = document.getElementById('verify-code-btn');
        continueReferralBtn = document.getElementById('continue-referral-btn');
        continueInterestsBtn = document.getElementById('continue-interests-btn');
        skipInterestsBtn = document.getElementById('skip-interests-btn');
        continueNameBtn = document.getElementById('continue-name-btn');
        continueBioBtn = document.getElementById('continue-bio-btn');
        skipBioBtn = document.getElementById('skip-bio-btn');
        
        phoneError = document.getElementById('phone-error');
        otpError = document.getElementById('otp-error');
        referralError = document.getElementById('referral-error');
        nameError = document.getElementById('name-error');
        
        dialCodeEl = document.getElementById('dial-code');
        phoneDisplayEl = document.getElementById('phone-display');
        countdownEl = document.getElementById('countdown');
        resendText = document.getElementById('resend-text');
        resendBtn = document.getElementById('resend-btn');
        userNameEl = document.getElementById('user-name');
        waitlistLink = document.getElementById('waitlist-link');
        
        countryPicker = document.getElementById('country-picker');
        countryModal = document.getElementById('country-modal');
        countryList = document.getElementById('country-list');
        interestsGrid = document.getElementById('interests-grid');
        
        console.log('Crema: DOM elements loaded', { phoneInput, requestCodeBtn, countryPicker });
        
        // Get referral code from URL
        const urlParams = new URLSearchParams(window.location.search);
        referralCode = urlParams.get('ref') || '';
        
        // Build country list and interests grid
        buildCountryList();
        buildInterestsGrid();
        
        // Event listeners
        if (phoneInput) {
            phoneInput.addEventListener('input', handlePhoneInput);
            console.log('Crema: Phone input listener added');
        }
        if (otpInput) otpInput.addEventListener('input', handleOtpInput);
        if (referralInput) referralInput.addEventListener('input', handleReferralInput);
        if (firstNameInput) firstNameInput.addEventListener('input', handleNameInput);
        if (lastNameInput) lastNameInput.addEventListener('input', handleNameInput);
        
        if (requestCodeBtn) requestCodeBtn.addEventListener('click', handleRequestCode);
        if (verifyCodeBtn) verifyCodeBtn.addEventListener('click', handleVerifyCode);
        if (continueReferralBtn) continueReferralBtn.addEventListener('click', handleContinueReferral);
        if (continueInterestsBtn) continueInterestsBtn.addEventListener('click', handleContinueInterests);
        if (skipInterestsBtn) skipInterestsBtn.addEventListener('click', () => showStep('name'));
        if (continueNameBtn) continueNameBtn.addEventListener('click', handleContinueName);
        if (continueBioBtn) continueBioBtn.addEventListener('click', handleContinueBio);
        if (skipBioBtn) skipBioBtn.addEventListener('click', handleSkipBio);
        if (resendBtn) resendBtn.addEventListener('click', handleResendCode);
        if (waitlistLink) waitlistLink.addEventListener('click', () => window.location.href = '/crema/androidwaitlist/');
        
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

function buildInterestsGrid() {
    if (!interestsGrid) return;
    
    interestsGrid.innerHTML = interestTags.map(tag => {
        // Add special class for colored tags
        let specialClass = '';
        if (tag === 'Matcha lover') specialClass = 'matcha';
        else if (tag === 'Light roast') specialClass = 'light-roast';
        else if (tag === 'Dark roast') specialClass = 'dark-roast';
        
        return `<button class="interest-tag ${specialClass}" data-tag="${tag}">${tag}</button>`;
    }).join('');
    
    interestsGrid.querySelectorAll('.interest-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (selectedInterests.includes(tag)) {
                selectedInterests = selectedInterests.filter(t => t !== tag);
                btn.classList.remove('selected');
            } else {
                selectedInterests.push(tag);
                btn.classList.add('selected');
            }
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

function handleReferralInput(e) {
    // Uppercase and limit to 4 characters
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    e.target.value = value;
    continueReferralBtn.disabled = value.length < 4;
    referralError.textContent = '';
}

async function handleContinueReferral() {
    const code = referralInput.value.toUpperCase();
    
    continueReferralBtn.classList.add('loading');
    continueReferralBtn.disabled = true;
    referralError.textContent = '';
    
    try {
        // Validate the referral code
        const { data, error } = await supabaseClient.rpc('validate_referral_code', {
            p_referral_code: code
        });
        
        if (error) throw error;
        
        if (!data || !data.valid) {
            referralError.textContent = data?.message || 'Invalid referral code';
            continueReferralBtn.disabled = false;
            continueReferralBtn.classList.remove('loading');
            return;
        }
        
        // Use the referral code
        referralCode = code;
        await useReferralCode();
        
        // Continue to interests
        showStep('interests');
        
    } catch (error) {
        referralError.textContent = error.message || 'Invalid referral code. Please try again.';
    } finally {
        continueReferralBtn.classList.remove('loading');
        continueReferralBtn.disabled = false;
    }
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
        
        // Save phone number for waitlist
        localStorage.setItem('pbd_onboarding_phone', fullPhoneNumber);
        
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
            // New user - check if we have a referral code from URL
            if (referralCode) {
                // Use the URL referral code and skip referral step
                await useReferralCode();
                showStep('interests');
            } else {
                // No URL referral code - show referral step
                showStep('referral');
                referralInput.focus();
            }
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

async function handleContinueInterests() {
    continueInterestsBtn.classList.add('loading');
    continueInterestsBtn.disabled = true;
    
    try {
        // Save interests to profile
        if (selectedInterests.length > 0) {
            await supabaseClient
                .from('profiles')
                .update({ interests: selectedInterests })
                .eq('id', userId);
        }
        
        showStep('name');
        firstNameInput.focus();
        
    } catch (error) {
        console.error('Failed to save interests:', error);
        showStep('name');
        firstNameInput.focus();
    } finally {
        continueInterestsBtn.classList.remove('loading');
        continueInterestsBtn.disabled = false;
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
        
        userFirstName = firstName;
        showStep('bio');
        
    } catch (error) {
        nameError.textContent = error.message || 'Failed to save. Please try again.';
    } finally {
        continueNameBtn.classList.remove('loading');
        continueNameBtn.disabled = false;
    }
}

async function handleContinueBio() {
    const bio = bioInput.value.trim();
    
    continueBioBtn.classList.add('loading');
    continueBioBtn.disabled = true;
    
    try {
        // Update profile with bio
        if (bio) {
            await supabaseClient
                .from('profiles')
                .update({ bio: bio })
                .eq('id', userId);
        }
        
        userNameEl.textContent = userFirstName || 'Friend';
        showStep('success');
        
    } catch (error) {
        console.error('Failed to save bio:', error);
        userNameEl.textContent = userFirstName || 'Friend';
        showStep('success');
    } finally {
        continueBioBtn.classList.remove('loading');
        continueBioBtn.disabled = false;
    }
}

function handleSkipBio() {
    userNameEl.textContent = userFirstName || 'Friend';
    showStep('success');
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
    [phoneStep, otpStep, referralStep, interestsStep, nameStep, bioStep, successStep].forEach(el => {
        if (el) el.classList.remove('active');
    });
    
    switch (step) {
        case 'phone':
            phoneStep.classList.add('active');
            break;
        case 'otp':
            otpStep.classList.add('active');
            break;
        case 'referral':
            referralStep.classList.add('active');
            break;
        case 'interests':
            interestsStep.classList.add('active');
            break;
        case 'name':
            nameStep.classList.add('active');
            break;
        case 'bio':
            bioStep.classList.add('active');
            break;
        case 'success':
            successStep.classList.add('active');
            break;
    }
}

// Handle keyboard visibility - move buttons above keyboard
function setupKeyboardHandler() {
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const bottomButtons = document.querySelectorAll('.bottom-button, .bottom-buttons-stack');
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
            const bottomButtons = document.querySelectorAll('.bottom-button, .bottom-buttons-stack');
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
