import React, { useState, useEffect } from 'react';
import { useLogin, useCheckAuth } from 'react-admin';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, CircularProgress, InputAdornment, IconButton, Alert,
} from '@mui/material';
import Visibility from '@mui/icons-material/VisibilityOutlined';
import VisibilityOff from '@mui/icons-material/VisibilityOffOutlined';
import CrisisAlertOutlinedIcon from '@mui/icons-material/CrisisAlertOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { useBranding } from '../branding.js';
import { BrandMark } from '../ui/BrandMark.js';
import { color } from '../design/tokens.js';

const CAPABILITIES = [
  { icon: <CrisisAlertOutlinedIcon />, text: 'Emergency alerts with care-manager dispatch' },
  { icon: <EventAvailableOutlinedIcon />, text: 'Appointments and video consultations' },
  { icon: <LocalShippingOutlinedIcon />, text: 'Pharmacy orders and lab sample collection' },
];

export const CustomLogin: React.FC = () => {
  const { branding } = useBranding();
  const login = useLogin();
  const checkAuth = useCheckAuth();
  const navigate = useNavigate();
  // Someone already signed in has no business on the sign-in screen: send them
  // to the dashboard. `false` stops a failed check from logging out or
  // notifying — on this page "not authenticated" is the normal case, not an
  // error. Rendering is held until the check settles so the form never flashes.
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  useEffect(() => {
    checkAuth({}, false)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setCheckingSession(false));
  }, [checkAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your work email.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await login({ username: email.trim(), password });
    } catch (err: any) {
      setErrors({ form: err?.message || 'Sign-in failed. Check your email and password and try again.' });
      setLoading(false);
    }
  };

  // Held only while the session check settles (a synchronous token read), so
  // an authenticated visitor is redirected without ever seeing the form.
  if (checkingSession) {
    return <Box sx={{ minHeight: '100vh', bgcolor: color.canvas }} aria-busy="true" />;
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 6fr)' }, bgcolor: color.canvas }}>
      {/* Context panel */}
      <Box
        component="aside"
        aria-label="About this console"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, lg: 7 },
          bgcolor: color.primary,
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Quiet cross-hatch texture, low contrast — structure, not decoration */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.07,
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, black, transparent 85%)',
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          {branding.app_logo ? (
            <Box component="img" src={branding.app_logo} alt="" sx={{ height: 34, maxWidth: 160, objectFit: 'contain', bgcolor: '#fff', borderRadius: '8px', p: 0.5 }} />
          ) : (
            <BrandMark size={34} inverted />
          )}
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em' }}>{branding.app_name}</Typography>
        </Box>

        <Box sx={{ position: 'relative', maxWidth: 440 }}>
          <Typography component="p" sx={{ fontSize: { md: '1.75rem', lg: '2rem' }, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            Coordinate care delivery from one console.
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 4, display: 'grid', gap: 2 }}>
            {CAPABILITIES.map((c) => (
              <Box component="li" key={c.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: '8px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.12)', '& svg': { fontSize: 18 } }}>
                  {c.icon}
                </Box>
                <Typography sx={{ fontSize: '0.95rem', opacity: 0.92 }}>{c.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography sx={{ position: 'relative', fontSize: '0.8125rem', opacity: 0.75 }}>
          Authorized staff only. Every administrative change is recorded in the audit log.
        </Typography>
      </Box>

      {/* Form */}
      <Box component="main" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 5 } }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25, mb: 5 }}>
            {branding.app_logo ? (
              <Box component="img" src={branding.app_logo} alt="" sx={{ height: 30, maxWidth: 140, objectFit: 'contain' }} />
            ) : (
              <BrandMark size={30} />
            )}
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{branding.app_name}</Typography>
          </Box>

          <Typography variant="h4" component="h1">Sign in</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3.5 }}>
            Use your work email and password to open the {branding.app_tagline?.toLowerCase() || 'console'}.
          </Typography>

          {errors.form && (
            <Alert severity="error" sx={{ mb: 2.5 }} role="alert">
              {errors.form}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.25 }}>
            <TextField
              id="login-email"
              label="Work email"
              type="email"
              autoComplete="email"
              autoFocus
              fullWidth
              size="medium"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((x) => ({ ...x, email: undefined })); }}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
              placeholder="name@pranova.com"
            />
            <TextField
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              fullWidth
              size="medium"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((x) => ({ ...x, password: undefined })); }}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 0.5, py: 1.25 }}>
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} aria-label="Signing in" /> : 'Sign in'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 4, display: { md: 'none' } }}>
            Authorized staff only. Every administrative change is recorded in the audit log.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CustomLogin;
