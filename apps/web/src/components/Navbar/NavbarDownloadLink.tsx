import { useState } from "react";
import Link from "next/link";
import { APPSTORE_URL } from "@/constants/api";
import { motion } from "framer-motion";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/solid";
import { QRCodeSVG } from "qrcode.react";

export const NavbarDownloadLink = () => {
    const [showQRCode, setShowQRCode] = useState(false);

    return (
        <Link href={APPSTORE_URL}>
            <motion.div
                className="relative bg-neutral-900 text-white dark:text-black dark:bg-neutral-50 px-3 py-1 rounded-full flex items-center gap-1"
                onHoverStart={() => setShowQRCode(true)}
                onHoverEnd={() => setShowQRCode(false)}
            >
                Download
                <DevicePhoneMobileIcon className="h-4" />
                <motion.div
                    initial={{
                        display: "none",
                    }}
                    animate={{
                        opacity: showQRCode ? 1 : 0,
                        display: showQRCode ? "block" : "none",
                    }}
                    className={
                        "p-2 backdrop-blur-lg bg-white rounded-xl absolute top-10 left-1/2 -translate-x-1/2 border border-neutral-100 dark:border-neutral-400/20 shadow-md"
                    }
                >
                    <QRCodeSVG
                        value={APPSTORE_URL}
                        fgColor="#000000"
                        bgColor="transparent"
                        level="L"
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
                </motion.div>
            </motion.div>
        </Link>
    );
};
