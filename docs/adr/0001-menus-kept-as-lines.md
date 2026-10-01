# Menus are kept as the lines of a meal's cell

The menu pages (the SNU Co-op's, the dormitory's and the veterinary college's) write each meal as free text: on 2026-10-01 only 36% of the lines were a dish with one price; the rest were corner headings with a set price, dishes under them without a price, several prices on one line, and `※` notes for hours, busy times and closures. A meal is therefore stored as its lines in the page's order, each with its text and, only when the parser is sure, a kind (heading, dish or note) and one price. Operating hours are note lines of a meal, not a field of a restaurant. We chose this over a structured model of dishes with prices, which would drop or misread most lines, and over a two-level model of corners and dishes, which would attach a dish to the wrong corner whenever a rule fails. A line the parser misreads is still shown as the page wrote it.

## Consequences

- The app (P15) renders lines and reads a price only where one is set. It does not group by corner or compute a meal's cheapest dish.
- The model is provisional until the collectors have run on the real pages and the team has reviewed how many lines got a kind and a price (P07 spec, Menus).
