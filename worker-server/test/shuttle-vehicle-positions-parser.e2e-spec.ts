import { parseVehiclePositions } from '../src/shuttle/vehicle-positions.parser.js';
import { blockPage, savedAnswer } from './pages.js';

const answer = savedAnswer('shuttle-vehicles-2026-10-02');

describe("The operator's vehicle positions", () => {
  it('give each vehicle with its carid and its position on the drawing', () => {
    expect(parseVehiclePositions(answer)).toEqual([
      { carId: '4522', x: 157, y: 40 },
      { carId: '4521', x: 195, y: 294 },
      { carId: '4531', x: 195, y: 294 },
      { carId: '4536', x: 195, y: 294 },
      { carId: '4520', x: 157, y: 398 },
      { carId: '4524', x: 116, y: 294 },
    ]);
  });

  it('give several vehicles at one stop as one each, though their rows share the count and the plates', () => {
    const atNewMaterials = parseVehiclePositions(answer).filter(({ x, y }) => x === 195 && y === 294);

    expect(atNewMaterials.map(({ carId }) => carId)).toEqual(['4521', '4531', '4536']);
  });

  it('give a position that is not exactly on a stop as it is', () => {
    // 4524 halfway between 기숙사삼거리 (top 239) and 교수회관 (top 289).
    const between = answer.replace('4524/116/294/', '4524/116/266/');

    expect(parseVehiclePositions(between)).toContainEqual({ carId: '4524', x: 116, y: 266 });
  });

  it('give no vehicles in an empty answer', () => {
    // `d` emptied, as the operator answered on Sunday 2026-09-27, when no vehicle ran (external-sources.md, 5).
    expect(parseVehiclePositions(answer.replace(/"d":".*"/u, '"d":""'))).toEqual([]);
  });
});

describe('An answer that is not the vehicle positions the parser knows', () => {
  it("is refused when it is the firewall's block page", () => {
    expect(() => parseVehiclePositions(blockPage)).toThrow("The answer is not the operator's vehicle positions");
  });

  it('is refused when a row has no vehicle', () => {
    // 4521's row cut short after its x.
    const shortRow = answer.replace('4521/195/294/3/ 71소1258, 71소1246, 71소1244/', '4521/195/');

    expect(() => parseVehiclePositions(shortRow)).toThrow('The answer has a row without a vehicle: 4521/195/');
  });
});
