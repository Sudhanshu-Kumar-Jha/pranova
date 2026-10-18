import React, { useEffect, useState } from 'react';
import { useNotify, Title } from 'react-admin';
import { Box, TextField, Button, Avatar, Typography, Skeleton, FormControlLabel, Switch, InputAdornment } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { apiClient } from '../providers/dataProvider.js';
import { useBranding } from '../branding.js';
import { PageHeader } from '../ui/Panel.js';
import { FormSection, FullWidth } from '../ui/FormSection.js';
import { BrandMark } from '../ui/BrandMark.js';
import { color } from '../design/tokens.js';

const MAX_IMG_BYTES = 500 * 1024; // keeps the data: URL small enough for the database

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type ImageKey = 'app_logo' | 'app_favicon';

export const BrandingSettings: React.FC = () => {
  const notify = useNotify();
  const { refresh } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    app_name: '', app_tagline: '', support_email: '', primary_color: color.primary, app_logo: '', app_favicon: '',
    mobile_app_name: '', mobile_tagline: '', support_phone: '', emergency_number: '',
    pharmacy_delivery_fee: '', pharmacy_free_delivery_threshold: '', pharmacy_min_order_amount: '',
    pharmacy_cod_enabled: 'true', pharmacy_online_payment_enabled: 'false',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/settings');
        setForm((f) => ({ ...f, ...(res.data?.data || {}) }));
      } catch {
        notify('Settings could not be loaded. Refresh the page to try again.', { type: 'warning' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const onFile = async (k: ImageKey, file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMG_BYTES) {
      notify(`That image is ${Math.round(file.size / 1024)} KB. Use one under ${MAX_IMG_BYTES / 1024} KB, or paste a hosted URL instead.`, { type: 'error' });
      return;
    }
    try {
      set(k, await readAsDataUrl(file));
    } catch {
      notify('The image file could not be read.', { type: 'error' });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings', form);
      await refresh();
      setDirty(false);
      notify('Settings saved', { type: 'success' });
    } catch (e: any) {
      notify(e.response?.data?.message || 'Settings could not be saved. Try again.', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // A render function, not a nested component: a component defined here would
  // remount on every keystroke and steal focus from the URL field.
  const imageField = (k: ImageKey, label: string, size: number, hint: string) => (
    <FullWidth>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Avatar variant="rounded" src={form[k] || undefined} alt="" sx={{ width: size, height: size, bgcolor: color.surfaceSunken, border: `1px solid ${color.line}`, color: color.subtle, fontSize: '0.75rem' }}>
          None
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button component="label" size="small" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
              Upload {label.toLowerCase()}
              <input hidden type="file" accept="image/*" onChange={(e) => onFile(k, e.target.files?.[0])} />
            </Button>
            {form[k] && <Button size="small" color="error" onClick={() => set(k, '')}>Remove</Button>}
          </Box>
          <TextField
            id={`settings-${k}`}
            label={`Or paste a ${label.toLowerCase()} URL`}
            value={form[k]?.startsWith('data:') ? '' : form[k] || ''}
            placeholder="https://…"
            onChange={(e) => set(k, e.target.value)}
            helperText={form[k]?.startsWith('data:') ? 'Using the uploaded image.' : hint}
            fullWidth
          />
        </Box>
      </Box>
    </FullWidth>
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Title title="Settings" />
      <PageHeader
        title="Settings"
        description="Branding and storefront rules for the console and the patient app. Changes apply as soon as you save - the app picks them up on its next launch or refresh."
        actions={
          <Button variant="contained" onClick={save} disabled={saving || loading || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', px: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Box sx={{ py: 3, display: 'grid', gap: 1.5 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}
          </Box>
        ) : (
          <>
            <FormSection first title="Preview" description="How your brand appears in the top bar." columns={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, border: `1px solid ${color.line}`, borderRadius: '8px', bgcolor: color.canvas, width: 'fit-content', maxWidth: '100%' }}>
                {form.app_logo ? (
                  <Box component="img" src={form.app_logo} alt="" sx={{ height: 28, maxWidth: 140, objectFit: 'contain' }} />
                ) : (
                  <BrandMark size={28} />
                )}
                <Typography sx={{ fontWeight: 700 }}>{form.app_name || 'PRANOVA'}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{form.app_tagline}</Typography>
              </Box>
            </FormSection>

            <FormSection title="Identity" description="Shown in the top bar, on sign-in and in the tab title.">
              <TextField id="settings-name" label="Product name" value={form.app_name || ''} onChange={(e) => set('app_name', e.target.value)} fullWidth />
              <TextField id="settings-tagline" label="Tagline" value={form.app_tagline || ''} onChange={(e) => set('app_tagline', e.target.value)} fullWidth />
              <TextField id="settings-email" label="Support email" type="email" value={form.support_email || ''} onChange={(e) => set('support_email', e.target.value)} fullWidth />
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  id="settings-color"
                  label="Primary colour"
                  value={form.primary_color || ''}
                  onChange={(e) => set('primary_color', e.target.value)}
                  helperText="Saved with your branding. The console keeps its standard palette."
                  fullWidth
                />
                <Box
                  component="input"
                  type="color"
                  aria-label="Pick primary colour"
                  value={/^#[0-9a-f]{6}$/i.test(form.primary_color || '') ? form.primary_color : color.primary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('primary_color', e.target.value)}
                  sx={{ width: 40, height: 40, p: 0.25, border: `1px solid ${color.line}`, borderRadius: '6px', bgcolor: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                />
              </Box>
            </FormSection>

            <FormSection title="Logo and favicon" description="Images up to 500 KB are stored with your settings. Use a hosted URL for anything larger." columns={1}>
              {imageField('app_logo', 'Logo', 64, 'A wide or square logo on a transparent background works best.')}
              {imageField('app_favicon', 'Favicon', 40, 'A square image, at least 32 × 32 pixels.')}
            </FormSection>

            <FormSection
              title="Patient app"
              description="What the native app shows on its sign-in screen and home header. It reads this from the API, so you do not need a new build to change it. The logo above is used here too."
            >
              <TextField id="settings-mobile-name" label="App name" value={form.mobile_app_name || ''} onChange={(e) => set('mobile_app_name', e.target.value)} helperText="Falls back to the product name when empty." fullWidth />
              <TextField id="settings-mobile-tagline" label="App tagline" value={form.mobile_tagline || ''} onChange={(e) => set('mobile_tagline', e.target.value)} fullWidth />
              <TextField id="settings-support-phone" label="Support phone" value={form.support_phone || ''} onChange={(e) => set('support_phone', e.target.value)} helperText="Shown to patients who need help with an order." fullWidth />
              <TextField id="settings-emergency" label="Emergency number" value={form.emergency_number || ''} onChange={(e) => set('emergency_number', e.target.value)} helperText="Dialled by the SOS banner in the app." fullWidth />
            </FormSection>

            <FormSection
              title="Pharmacy checkout"
              description="Delivery pricing is applied by the server when an order is placed. The app only displays these numbers, so changing them here changes what patients pay."
            >
              <TextField
                id="settings-delivery-fee"
                label="Delivery fee"
                value={form.pharmacy_delivery_fee ?? ''}
                onChange={(e) => set('pharmacy_delivery_fee', e.target.value.replace(/[^0-9.]/g, ''))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputMode="decimal"
                fullWidth
              />
              <TextField
                id="settings-free-threshold"
                label="Free delivery above"
                value={form.pharmacy_free_delivery_threshold ?? ''}
                onChange={(e) => set('pharmacy_free_delivery_threshold', e.target.value.replace(/[^0-9.]/g, ''))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText="Orders at or above this subtotal ship free."
                inputMode="decimal"
                fullWidth
              />
              <TextField
                id="settings-min-order"
                label="Minimum order value"
                value={form.pharmacy_min_order_amount ?? ''}
                onChange={(e) => set('pharmacy_min_order_amount', e.target.value.replace(/[^0-9.]/g, ''))}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText="Set to 0 for no minimum."
                inputMode="decimal"
                fullWidth
              />
              <Box sx={{ display: 'grid', gap: 0.5 }}>
                <FormControlLabel
                  control={<Switch checked={form.pharmacy_cod_enabled !== 'false'} onChange={(e) => set('pharmacy_cod_enabled', e.target.checked ? 'true' : 'false')} />}
                  label="Accept cash on delivery"
                />
                <FormControlLabel
                  control={<Switch checked={form.pharmacy_online_payment_enabled === 'true'} onChange={(e) => set('pharmacy_online_payment_enabled', e.target.checked ? 'true' : 'false')} />}
                  label="Accept online payment"
                />
                <Typography variant="caption" color="text.secondary">
                  No payment gateway is connected yet, so leave online payment off until one is configured. With both off, patients cannot check out.
                </Typography>
              </Box>
            </FormSection>
          </>
        )}
      </Box>
    </Box>
  );
};

export default BrandingSettings;
