import React from 'react';
import { useInput } from 'react-admin';
import { Box, Button, TextField, Typography } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { color } from '../design/tokens.js';

const MAX_IMG_BYTES = 400 * 1024; // stored inline on the record, so keep it small

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Square preview that degrades to a placeholder when there is no image. */
export const ImageThumb: React.FC<{ src?: string | null; size?: number; alt?: string }> = ({
  src, size = 40, alt = '',
}) => (
  <Box
    sx={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: '8px',
      border: `1px solid ${color.line}`,
      bgcolor: color.surfaceSunken,
      display: 'grid',
      placeItems: 'center',
      overflow: 'hidden',
      color: color.subtle,
    }}
  >
    {src ? (
      <Box component="img" src={src} alt={alt} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    ) : (
      <ImageOutlinedIcon sx={{ fontSize: size * 0.5 }} aria-hidden />
    )}
  </Box>
);

interface ProductImageInputProps {
  source: string;
  label?: string;
  helperText?: string;
  /** Edge of the preview square, in px. */
  previewSize?: number;
}

/**
 * Product photo for a catalogue record: upload a small file (stored as a
 * `data:` URL on the record) or paste a hosted URL. The preview is what the
 * patient app will render, so what you see here is what ships.
 */
export const ProductImageInput: React.FC<ProductImageInputProps> = ({
  source, label = 'Product image', helperText, previewSize = 88,
}) => {
  const { field, fieldState, isRequired } = useInput({ source });
  const [error, setError] = React.useState<string | null>(null);
  const value: string = field.value || '';
  const isUpload = value.startsWith('data:');

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMG_BYTES) {
      setError(`That image is ${Math.round(file.size / 1024)} KB. Use one under ${MAX_IMG_BYTES / 1024} KB, or paste a hosted URL.`);
      return;
    }
    try {
      setError(null);
      field.onChange(await readAsDataUrl(file));
    } catch {
      setError('The image file could not be read.');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <ImageThumb src={value} size={previewSize} alt="" />
      <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component="label" size="small" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
            Upload image
            <input hidden type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          </Button>
          {value && (
            <Button size="small" color="error" onClick={() => { setError(null); field.onChange(''); }}>
              Remove
            </Button>
          )}
        </Box>
        <TextField
          id={`image-${source}`}
          label="Or paste an image URL"
          value={isUpload ? '' : value}
          placeholder="https://…"
          onChange={(e) => { setError(null); field.onChange(e.target.value); }}
          size="small"
          fullWidth
          error={Boolean(error) || Boolean(fieldState.error)}
          helperText={
            error ??
            fieldState.error?.message ??
            (isUpload ? 'Using the uploaded image. Remove it to paste a URL instead.' : helperText)
          }
          required={isRequired}
        />
      </Box>
    </Box>
  );
};

export default ProductImageInput;
