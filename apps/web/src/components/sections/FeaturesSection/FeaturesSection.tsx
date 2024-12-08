import { FeaturesSectionItem } from "@/components/sections/FeaturesSection/FeaturesSectionItem";
import Image from "next/image";
import IphoneMockup from "../../../../public/iphone.png";
import WatchMockup from "../../../../public/watch.png";

export const FeaturesSection = () => {
    return (
        <div className="w-full flex justify-center bg-white dark:bg-neutral-950 text-black dark:text-white border-t border-t-neutral-200 dark:border-t-neutral-900 px-4 py-12">
            <section className="max-w-screen-lg w-full flex lg:flex-row flex-col lg:gap-6 gap-24 py-12 items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-2xl">Features</h2>
                    <FeaturesSectionItem>
                        Real-time departures
                    </FeaturesSectionItem>
                    <FeaturesSectionItem>Subway</FeaturesSectionItem>
                    <FeaturesSectionItem>Bus</FeaturesSectionItem>
                    <FeaturesSectionItem>Tram</FeaturesSectionItem>
                    <FeaturesSectionItem>
                        Train, funicular or ferry? We got it all!
                    </FeaturesSectionItem>
                </div>

                <div className="flex gap-12 items-center">
                    <div className="w-48">
                        <Image
                            src={WatchMockup}
                            alt="App on Apple Watch"
                            placeholder="blur"
                        />
                    </div>
                    <div className="w-64">
                        <Image
                            src={IphoneMockup}
                            alt="App on iPhone"
                            placeholder="blur"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};
