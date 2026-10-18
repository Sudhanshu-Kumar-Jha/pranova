import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Surface,
  SegmentedButtons,
  Divider,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendOtp, verifyOtp } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useBrand } from '../../src/providers/AppConfigProvider';
import { BrandLogo } from '../../src/components/BrandLogo';
import { getCurrentLocationDetails } from '../../src/utils/location';
import { palette, onColor } from '../../src/theme';

/** A development build may prefill the seeded demo patient; a release never does. */
const DEV_PHONE = '+919123456789';

type AuthMode = 'signin' | 'register';
type AuthStep = 'form' | 'otp';

export default function LoginScreen() {
  const theme = useTheme();
  const brand = useBrand();
  const signIn = useAuthStore((s) => s.signIn);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<AuthStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In / Common fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Bagisto-style Customer Registration fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locDetecting, setLocDetecting] = useState(false);

  const handleSend = async () => {
    const cleanPhone = phone.replace(/[\s-]/g, '').trim();
    if (cleanPhone.length < 10) {
      setError('Please enter a valid mobile number (at least 10 digits).');
      return;
    }

    if (mode === 'register') {
      if (!firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!lastName.trim()) {
        setError('Please enter your last name.');
        return;
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await sendOtp(cleanPhone, mode === 'register' ? 'REGISTER' : 'LOGIN');
      setStep('otp');
    } catch (e: any) {
      const backendMsg = e?.response?.data?.message;
      if (backendMsg) {
        setError(backendMsg);
      } else if (!e?.response) {
        setError('Unable to reach server. Please check your internet connection and try again.');
      } else {
        setError('Could not verify mobile number. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = async () => {
    setLocDetecting(true);
    setError(null);
    try {
      const outcome = await getCurrentLocationDetails();
      if (!outcome.success || !outcome.data) {
        setError(
          outcome.error ||
            'Could not determine GPS location. Please check device location permissions.'
        );
        return;
      }
      const loc = outcome.data;
      if (loc.primaryAddress) setPrimaryAddress(loc.primaryAddress);
      if (loc.city) setCity(loc.city);
      if (loc.pincode) setPincode(loc.pincode);
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch (err: any) {
      setError(err?.message || 'Error detecting real-time location.');
    } finally {
      setLocDetecting(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.trim();
    if (code.length < 4) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let result;
      if (mode === 'register') {
        result = await verifyOtp({
          phone: phone.trim(),
          otp: code,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          primaryAddress: primaryAddress.trim() || undefined,
          city: city.trim() || undefined,
          pincode: pincode.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
        });
      } else {
        result = await verifyOtp(phone.trim(), code);
      }
      await signIn(result.user, result.tokens);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'That code is not valid. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep('form');
    setOtp('');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Surface style={styles.card} elevation={3}>
          {/* Brand Header */}
          <View style={styles.brandBox}>
            <BrandLogo size={52} />
            <Text variant="headlineSmall" style={[styles.brandTitle, { color: theme.colors.primary }]}>
              {brand.appName}
            </Text>
            {Boolean(brand.tagline) && (
              <Text variant="bodyMedium" style={styles.subTitle}>
                {brand.tagline}
              </Text>
            )}
          </View>

          {/* Mode Switcher Tabs */}
          {step === 'form' && (
            <SegmentedButtons
              value={mode}
              onValueChange={(val) => switchMode(val as AuthMode)}
              buttons={[
                {
                  value: 'signin',
                  label: 'Sign In',
                  icon: 'login-variant',
                },
                {
                  value: 'register',
                  label: 'Create Account',
                  icon: 'account-plus-outline',
                },
              ]}
              style={styles.segmentedButtons}
            />
          )}

          {step === 'form' ? (
            <>
              {mode === 'register' && (
                <>
                  <Text style={styles.sectionHeader}>
                    Customer Registration
                  </Text>
                  <Text style={styles.sectionSub}>
                    Create your account to order medicines, book diagnostic tests, and consult doctors.
                  </Text>

                  {/* Name Fields */}
                  <View style={styles.row}>
                    <TextInput
                      label="First name *"
                      value={firstName}
                      onChangeText={(val) => {
                        setFirstName(val);
                        if (error) setError(null);
                      }}
                      mode="outlined"
                      style={[styles.input, styles.halfCol]}
                      disabled={loading}
                    />
                    <TextInput
                      label="Last name *"
                      value={lastName}
                      onChangeText={(val) => {
                        setLastName(val);
                        if (error) setError(null);
                      }}
                      mode="outlined"
                      style={[styles.input, styles.halfCol]}
                      disabled={loading}
                    />
                  </View>

                  {/* Email */}
                  <TextInput
                    label="Email address (for receipts)"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (error) setError(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    mode="outlined"
                    placeholder="name@example.com"
                    left={<TextInput.Icon icon="email-outline" color={palette.muted} />}
                    style={styles.input}
                    disabled={loading}
                  />
                </>
              )}

              {/* Mobile Number */}
              <TextInput
                label={mode === 'register' ? 'Mobile number *' : 'Mobile number'}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (error) setError(null);
                }}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                mode="outlined"
                placeholder="+91 00000 00000"
                left={<TextInput.Icon icon="phone" color={palette.muted} />}
                style={styles.input}
                disabled={loading}
              />

              {mode === 'register' && (
                <>
                  {/* Delivery Address Details */}
                  <View style={styles.addressHeaderRow}>
                    <Text style={styles.addressSectionLabel}>Delivery Address</Text>
                    <Button
                      mode="text"
                      compact
                      icon="crosshairs-gps"
                      loading={locDetecting}
                      disabled={locDetecting || loading}
                      onPress={handleDetectLocation}
                      textColor="#0f766e"
                      labelStyle={{ fontWeight: '700', fontSize: 13 }}
                    >
                      {locDetecting ? 'Detecting...' : 'Use Current Location'}
                    </Button>
                  </View>

                  {Boolean(latitude && longitude) && (
                    <View style={styles.gpsDetectedPill}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#059669" />
                      <Text style={styles.gpsDetectedText}>
                        Live GPS Pin: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    label="Delivery Address (Street / Flat)"
                    value={primaryAddress}
                    onChangeText={(val) => {
                      setPrimaryAddress(val);
                      if (error) setError(null);
                    }}
                    mode="outlined"
                    placeholder="House / Flat No, Street, Landmark"
                    left={<TextInput.Icon icon="map-marker-outline" color={palette.muted} />}
                    style={styles.input}
                    disabled={loading}
                  />

                  <View style={styles.row}>
                    <TextInput
                      label="City"
                      value={city}
                      onChangeText={(val) => {
                        setCity(val);
                        if (error) setError(null);
                      }}
                      mode="outlined"
                      placeholder="e.g. Bengaluru"
                      style={[styles.input, styles.halfCol]}
                      disabled={loading}
                    />
                    <TextInput
                      label="Pincode"
                      value={pincode}
                      onChangeText={(val) => {
                        setPincode(val.replace(/[^0-9]/g, ''));
                        if (error) setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      mode="outlined"
                      placeholder="560001"
                      style={[styles.input, styles.halfCol]}
                      disabled={loading}
                    />
                  </View>
                </>
              )}

              <Text style={styles.hint}>
                {mode === 'register'
                  ? 'We will text an instant 6-digit code to verify your phone number.'
                  : 'Enter your registered phone to receive a quick verification code.'}
              </Text>

              {__DEV__ && mode === 'signin' && (
                <TouchableOpacity onPress={() => setPhone(DEV_PHONE)} style={styles.demoPill}>
                  <MaterialCommunityIcons name="flask-outline" size={14} color={palette.muted} />
                  <Text style={styles.demoPillText}>Development: use seeded test patient</Text>
                </TouchableOpacity>
              )}

              <Button
                mode="contained"
                onPress={handleSend}
                loading={loading}
                disabled={loading}
                style={styles.primaryBtn}
                labelStyle={{ color: onColor(theme.colors.primary), fontWeight: '700' }}
                contentStyle={{ height: 46 }}
              >
                {mode === 'register' ? 'Register & Send Code' : 'Send Code'}
              </Button>

              {/* Mode Toggle Link */}
              <View style={styles.toggleRow}>
                <Text style={styles.togglePrompt}>
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <TouchableOpacity onPress={() => switchMode(mode === 'signin' ? 'register' : 'signin')}>
                  <Text style={[styles.toggleAction, { color: theme.colors.primary }]}>
                    {mode === 'signin' ? 'Create an Account' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <View style={styles.otpHeaderBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={36} color={theme.colors.primary} />
                <Text style={styles.otpPrompt}>
                  Enter the 6-digit code sent to{' '}
                  <Text style={{ fontWeight: '700', color: palette.ink }}>{phone}</Text>
                </Text>
                {mode === 'register' && (
                  <Text style={styles.registerConfirmText}>
                    Registering: {firstName} {lastName}
                  </Text>
                )}
              </View>

              <TextInput
                label="Verification code"
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/[^0-9]/g, ''));
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                mode="outlined"
                maxLength={6}
                left={<TextInput.Icon icon="shield-key-outline" color={palette.muted} />}
                style={styles.input}
                disabled={loading}
              />

              {__DEV__ && (
                <View style={styles.devHintBox}>
                  <MaterialCommunityIcons name="information-outline" size={15} color={palette.info} />
                  <Text style={styles.devHintText}>Development code: 123456</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleVerify}
                loading={loading}
                disabled={loading}
                style={styles.primaryBtn}
                labelStyle={{ color: onColor(theme.colors.primary), fontWeight: '700' }}
                contentStyle={{ height: 46 }}
              >
                {mode === 'register' ? 'Complete Registration' : 'Verify & Continue'}
              </Button>

              <Button
                mode="text"
                onPress={() => {
                  setStep('form');
                  setOtp('');
                  setError(null);
                }}
                disabled={loading}
                textColor={palette.muted}
              >
                Change mobile number or details
              </Button>
            </>
          )}

          {error && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeaderRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#b91c1c" />
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
              {mode === 'signin' && error.toLowerCase().includes('not registered') && (
                <Button
                  mode="contained-tonal"
                  compact
                  icon="account-plus-outline"
                  onPress={() => switchMode('register')}
                  style={styles.registerSwitchBtn}
                  labelStyle={styles.registerSwitchBtnLabel}
                >
                  Create an Account
                </Button>
              )}
            </View>
          )}

          <Divider style={{ marginVertical: 8 }} />

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={palette.muted} />
            <Text style={styles.footerText}>
              Your health data and orders are strictly encrypted & HIPAA-compliant.
            </Text>
          </View>

          {Boolean(brand.supportPhone || brand.supportEmail) && (
            <Text style={styles.supportText}>
              Need help? {brand.supportPhone || brand.supportEmail}
            </Text>
          )}
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 32,
  },
  card: {
    borderRadius: 20,
    padding: 22,
    backgroundColor: palette.surface,
    gap: 10,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    color: palette.muted,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
    marginTop: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: palette.muted,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfCol: {
    flex: 1,
  },
  input: {
    backgroundColor: palette.surface,
  },
  hint: {
    fontSize: 12,
    color: palette.muted,
    lineHeight: 16,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.hairline,
  },
  demoPillText: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 12,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  togglePrompt: {
    fontSize: 13,
    color: palette.muted,
  },
  toggleAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  otpHeaderBox: {
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  otpPrompt: {
    fontSize: 15,
    color: palette.body,
    textAlign: 'center',
  },
  registerConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.info,
  },
  devHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.infoSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  devHintText: {
    fontSize: 12,
    color: palette.info,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },
  registerSwitchBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#b91c1c',
  },
  registerSwitchBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: palette.muted,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 11,
    color: palette.muted,
    textAlign: 'center',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 4,
  },
  addressSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  gpsDetectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  gpsDetectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
});
