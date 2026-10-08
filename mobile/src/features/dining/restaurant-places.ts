// The Place of each restaurant whose menus are collected: the restaurant's name as `GET /menus` gives it, and the
// number of its Place as `GET /places` gives it. From the Co-op's page of restaurant information and the wireframe,
// checked against the seed's Places. A restaurant that is not here, or whose Place is not answered, has no pin and
// is still in the menu panel. The four restaurants whose names start with "* " are not collected.
export const RESTAURANT_PLACES: Readonly<Record<string, string>> = {
  학생회관식당: '63',
  '자하연식당 2층': '109',
  '자하연식당 3층': '109',
  예술계식당: '74',
  두레미담: '75-1',
  '3식당': '75-1',
  동원관식당: '113',
  '301동식당': '301',
  '302동식당': '302',
  '아워홈(901동)': '901',
  '생협기숙사(919동)': '919',
  수의대식당: '85',
};
