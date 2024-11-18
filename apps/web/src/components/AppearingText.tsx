import { motion } from "framer-motion";

type Props = {
    text: string;
};

export const AppearingText = (props: Props) => {
    const { text } = props;

    return (
        <>
            {text.split("").map((letter, index) => (
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: 0.01,
                        delay: index / 100,
                    }}
                    key={index}
                >
                    {letter}
                </motion.span>
            ))}
        </>
    );
};
