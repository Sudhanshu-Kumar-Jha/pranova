import React, { useState } from 'react';
import { Box, Button, Typography, Collapse } from '@mui/material';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { color } from '../design/tokens.js';

interface CustomErrorProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  resetErrorBoundary?: (...args: any[]) => void;
}

/**
 * Screen-level error boundary fallback. Leads with what happened and what to
 * do; the stack trace stays available (collapsed) for developers.
 */
export const CustomError: React.FC<CustomErrorProps> = ({ error, errorInfo, resetErrorBoundary }) => {
  const [showDetails, setShowDetails] = useState(false);
  const message = error?.message || 'An unexpected error occurred in this screen.';
  const stack = errorInfo?.componentStack || error?.stack || '';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', py: { xs: 4, md: 8 }, px: 2 }}>
      <Box
        role="alert"
        sx={{ width: '100%', maxWidth: 560, bgcolor: 'background.paper', border: `1px solid ${color.line}`, borderRadius: '10px', p: { xs: 3, sm: 4 } }}
      >
        <Box aria-hidden sx={{ width: 44, height: 44, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: color.errorSoft, color: color.error, mb: 2 }}>
          <ErrorOutlineOutlinedIcon />
        </Box>
        <Typography variant="h5" component="h1">This screen couldn't load</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your data is safe. Try again, or go back to the dashboard. If it keeps happening, share the technical details below with your engineering team.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => (resetErrorBoundary ? resetErrorBoundary() : window.location.reload())}
          >
            Try again
          </Button>
          <Button variant="outlined" href="#/dashboard" onClick={() => resetErrorBoundary?.()}>
            Go to dashboard
          </Button>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${color.lineSoft}` }}>
          <Button size="small" color="inherit" onClick={() => setShowDetails((s) => !s)} aria-expanded={showDetails} sx={{ color: 'text.secondary', px: 0 }}>
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </Button>
          <Collapse in={showDetails}>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, wordBreak: 'break-word' }}>{message}</Typography>
            {stack && (
              <Box
                component="pre"
                tabIndex={0}
                sx={{
                  mt: 1, p: 1.5, maxHeight: 240, overflow: 'auto', borderRadius: '8px', bgcolor: color.surfaceSunken,
                  border: `1px solid ${color.lineSoft}`, fontSize: '0.75rem', lineHeight: 1.5,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', whiteSpace: 'pre-wrap',
                }}
              >
                {stack}
              </Box>
            )}
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};

export default CustomError;
