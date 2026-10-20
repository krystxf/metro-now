import { QRCodeSVG } from "qrcode.react";
import { APPSTORE_URL } from "@/constants/api";

type AppStoreQRCodeProps = {
    className?: string;
    fgColor?: string;
};

export const AppStoreQRCode = ({
    className,
    fgColor = "#000000",
}: AppStoreQRCodeProps) => (
    <QRCodeSVG
        value={APPSTORE_URL}
        className={className}
        bgColor="transparent"
        fgColor={fgColor}
        level="Q"
        imageSettings={{
            src: "/appstore-icon.svg",
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            opacity: 1,
            excavate: true,
        }}
    />
);
