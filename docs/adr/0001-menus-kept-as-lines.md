# Menus are kept as the lines of a meal's cell

The menu pages (the SNU Co-op's, the dormitory's and the veterinary college's) write each meal as free text. In the first collection, of the pages of 2026-10-01 and 10-02, 114 of the 303 lines were a dish with one price; the rest were corner headings, some with a set price, dishes listed under them without a price, and `※` notes for hours, busy times and notices. A meal is therefore stored as its lines in the page's order, each with its text and, only when the parser is sure, a kind (heading, dish or note), one price and, for a dish with a price, the dish's name without the price. Operating hours are note lines of a meal, not a field of a restaurant.

We chose this over a structured model of dishes with prices, which is what the Siksha app shows. Siksha's collectors keep the menu lines with their prices and drop the notes, the hours and the closures, and its server holds each restaurant's hours as data entered by hand (`.scratch/research/external-sources.md` §9). We also chose it over a two-level model of corners and dishes, which would attach a dish to the wrong corner whenever a rule fails. A line the parser misreads is still shown as the page wrote it, and because the text is stored, a later rule can read more from it without collecting again.

## Consequences

- The app (P15) shows a dish that has a name and a price as a row with both, as Siksha does, and every other line as its text. It does not group by corner or compute a meal's cheapest dish.
- A kind is read from the line alone. A dish listed under a heading with a set price has no kind and no price of its own.
- Hours are text, so the app cannot say whether a restaurant is open now.
