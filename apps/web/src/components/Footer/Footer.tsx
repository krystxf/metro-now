import {
    APPSTORE_URL,
    GRAPHQL_URL,
    SOURCE_CODE_URL,
    SWAGGER_URL,
} from "@/constants/api";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { GolemioLogo } from "../GolemioLogo/GolemioLogo";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { FooterLink } from "@/components/Footer/FooterLink";
import { FooterSection } from "@/components/Footer/FooterSection";
import { FooterSectionHeading } from "@/components/Footer/FooterSectionHeading";

export const Footer = () => {
    return (
        <div className="w-full flex justify-center bg-zinc-50 dark:bg-zinc-950 text-black dark:text-whit border-t dark:border-neutral-900 border-neutral-200">
            <div className="max-w-screen-lg w-full py-12 px-8 flex gap-12 justify-between items-start flex-wrap">
                <FooterSection>
                    <Link href={SOURCE_CODE_URL} target="_blank">
                        <FooterSectionHeading className="hover:underline dark:hover:text-neutral-200 hover:text-neutral-900 transition-all ease-in-out">
                            Source Code
                            <ArrowTopRightOnSquareIcon className="h-4" />
                        </FooterSectionHeading>
                    </Link>
                    <p className="text-xs text-neutral-500">
                        Every line of code for this project is available on
                        GitHub.
                    </p>

                    <FooterSectionHeading className="mt-8">
                        Data Providers
                    </FooterSectionHeading>
                    <FooterLink
                        href="https://api.golemio.cz/pid/docs/openapi/"
                        target="_blank"
                    >
                        <GolemioLogo className="h-12 w-fit" />
                    </FooterLink>
                </FooterSection>

                <FooterSection>
                    <FooterSectionHeading>API</FooterSectionHeading>
                    <FooterLink href={SWAGGER_URL} target="_blank">
                        REST API
                        <ArrowTopRightOnSquareIcon className="h-4" />
                    </FooterLink>
                    <FooterLink href={GRAPHQL_URL} target="_blank">
                        GraphQL
                        <ArrowTopRightOnSquareIcon className="h-4" />
                    </FooterLink>

                    <FooterSectionHeading className="mt-8">
                        Legal
                    </FooterSectionHeading>
                    <FooterLink href="/docs/terms-and-conditions">
                        Terms & conditions
                    </FooterLink>
                    <FooterLink href="/docs/privacy-policy">
                        Privacy policy
                    </FooterLink>
                </FooterSection>
                <FooterSection>
                    <FooterSectionHeading>Download</FooterSectionHeading>
                    <QRCodeSVG
                        value={APPSTORE_URL}
                        className="dark:p-2 dark:rounded-xl dark:bg-white transition-all ease-in-out dark:border dark:border-neutral-900 rounded dark:shadow-lg"
                        bgColor="transparent"
                        fgColor="black"
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
                </FooterSection>
            </div>
        </div>
    );
};
