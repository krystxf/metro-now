import Link from "next/link";
import Image from "next/image";
import MetroNowIcon from "../../../public/metro-now-icon.png";
import { motion } from "framer-motion";
import { NavbarDivider } from "@/components/Navbar/NavbarDivider";

type Props = {
    expanded: boolean;
};

export const NavbarAppLogo = (props: Props) => {
    const { expanded } = props;

    return (
        <Link href="/">
            <div className="flex items-center gap-2">
                <Image
                    className="rounded-lg"
                    alt="Icon"
                    src={MetroNowIcon}
                    height={32}
                    priority
                />
                <motion.div
                    initial={{
                        display: "block",
                        visibility: "visible",
                    }}
                    animate={{
                        overflowX: "hidden",
                        width: expanded ? "auto" : "0",
                    }}
                >
                    metro&nbsp;now
                </motion.div>

                <NavbarDivider expanded={expanded} />
            </div>
        </Link>
    );
};
