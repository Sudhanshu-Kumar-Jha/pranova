import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Divider, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendOtp, verifyOtp } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useBrand } from '../../src/providers/AppConfigProvider';
import { BrandLogo } from '../../src/components/BrandLogo';
import { onColor, palette } from '../../src/theme';

/**
 * Care managers are onboarded by an administrator in the console, so there is
 * no self-registration here — only phone + OTP sign-in against the account the
 * administrator created.
 *
 * A development build may offer the seeded field account; a release never does.
 */
const DEV_PHONE = '+919876543210';

type Step = 'phone' | 'otp';

export default function Login() {
  const theme = useTheme();
  const brand = useBrand();
  const signIn = useAuthStore((s) => s.signIn);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.replace(/\D/g, '').length < 10) {
      setError('Enter the mobile number registered for your field account.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendOtp(cleanPhone);
      setStep('otp');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          'We could not send the verification code. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
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
      const { user, tokens } = await verifyOtp(phone.trim(), code);
      await signIn(user, tokens);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'That code is not valid. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Surface style={styles.card} elevation={3}>
          <View style={styles.brandBox}>
            <BrandLogo size={52} />
            <Text variant="headlineSmall" style={[styles.brandTitle, { color: theme.colors.primary }]}>
              {brand.appName}
            </Text>
            <Text style={styles.surfaceLabel}>Care Manager · Field Operations</Text>
            {Boolean(brand.tagline) && (
              <Text variant="bodyMedium" style={styles.subTitle}>
                {brand.tagline}
              </Text>
            )}
          </View>

          {step === 'phone' ? (
            <>
              <TextInput
                label="Mobile number"
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

              <Text style={styles.hint}>
                Sign in with the number your administrator registered for you. A 6-digit code will
                be sent to verify this device.
              </Text>

              {__DEV__ && (
                <TouchableOpacity onPress={() => setPhone(DEV_PHONE)} style={styles.devPill}>
                  <MaterialCommunityIcons name="flask-outline" size={14} color={palette.muted} />
                  <Text style={styles.devPillText}>Development: use seeded field account</Text>
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
                Send Code
              </Button>
            </>
          ) : (
            <>
              <View style={styles.otpHeaderBox}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={36}
                  color={theme.colors.primary}
                />
                <Text style={styles.otpPrompt}>
                  Enter the 6-digit code sent to{' '}
                  <Text style={{ fontWeight: '700', color: palette.ink }}>{phone}</Text>
                </Text>
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
                Verify &amp; Continue
              </Button>

              <Button
                mode="text"
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
                disabled={loading}
                textColor={palette.muted}
              >
                Change mobile number
              </Button>
            </>
          )}

          {error ? (
            <HelperText type="error" visible style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Divider style={{ marginVertical: 8 }} />

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={palette.muted} />
            <Text style={styles.footerText}>
              Patient data accessed in the field is encrypted and fully audited.
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
  surfaceLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: palette.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subTitle: {
    color: palette.muted,
    textAlign: 'center',
  },
  input: {
    backgroundColor: palette.surface,
  },
  hint: {
    fontSize: 12,
    color: palette.muted,
    lineHeight: 16,
  },
  devPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: palette.hairline,
  },
  devPillText: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 12,
    marginTop: 4,
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
  errorText: {
    fontSize: 13,
    paddingHorizontal: 0,
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
});
