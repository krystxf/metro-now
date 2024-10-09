import { Card as _Card } from "@/components/Card/Card";
import { CardTitle } from "@/components/Card/CardTitle";
import { CardArrow } from "@/components/Card/CardArrow";
import { CardContent } from "@/components/Card/CardContent";
import { CardContentLink } from "@/components/Card/CardContentLink";

export const Card = Object.assign(_Card, {
    Title: CardTitle,
    Arrow: CardArrow,
    Content: Object.assign(CardContent, {
        Link: CardContentLink,
    }),
});
