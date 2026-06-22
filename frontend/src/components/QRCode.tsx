import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';
import { Box, Skeleton } from '@mui/material';

interface Props {
  value: string;
  size?: number;
}

/** Renders a string (e.g. a reset capability URL) as a scannable QR code. */
export default function QRCode({ value, size = 220 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCodeLib.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <Skeleton variant="rounded" width={size} height={size} />;
  }

  return (
    <Box
      component="img"
      src={dataUrl}
      alt="Password reset QR code"
      width={size}
      height={size}
      sx={{ borderRadius: 2, bgcolor: '#fff', p: 1 }}
    />
  );
}
