import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { convertSoupToGerberCommands } from "src/gerber/convert-soup-to-gerber-commands"
import { stringifyGerberCommandLayers } from "src/gerber/stringify-gerber"

test("hole_with_polygon_pad applies ccw_rotation to copper and soldermask regions (#155)", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "rotated_polygon_plated_hole",
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 0.8,
      pad_outline: [
        { x: -3, y: -0.5 },
        { x: 3, y: -0.5 },
        { x: 3, y: 0.5 },
        { x: -3, y: 0.5 },
      ],
      hole_offset_x: 0,
      hole_offset_y: 0,
      x: 1,
      y: 2,
      ccw_rotation: 90,
      layers: ["top", "bottom"],
      is_covered_with_solder_mask: false,
      soldermask_margin: 0.1,
    } as AnyCircuitElement,
  ]

  const gerberOutput = stringifyGerberCommandLayers(
    convertSoupToGerberCommands(circuitJson),
  )

  // Rotated 90 deg CCW around (1, 2):
  // (-3, -0.5) -> (0.5, -3) + (1, 2) = (1.5, -1)
  // (3, -0.5)  -> (0.5, 3)  + (1, 2) = (1.5, 5)
  // (3, 0.5)   -> (-0.5, 3) + (1, 2) = (0.5, 5)
  // (-3, 0.5)  -> (-0.5, -3)+ (1, 2) = (0.5, -1)
  expect(gerberOutput.F_Cu).toContain("G36*")
  expect(gerberOutput.F_Cu).toContain("X001500000Y-01000000D02*")
  expect(gerberOutput.F_Cu).toContain("X001500000Y005000000D01*")
  expect(gerberOutput.F_Cu).toContain("X000500000Y005000000D01*")
  expect(gerberOutput.F_Cu).toContain("X000500000Y-01000000D01*")

  // Soldermask margin (0.1mm) expands 6x1 bar to 6.2x1.2, rotated 90 deg CCW around (1, 2):
  // (-3.1, -0.6) -> (0.6, -3.1) + (1, 2) = (1.6, -1.1)
  // (3.1, -0.6)  -> (0.6, 3.1)  + (1, 2) = (1.6, 5.1)
  expect(gerberOutput.F_Mask).toContain("G36*")
  expect(gerberOutput.F_Mask).toContain("X001600000Y-01100000D02*")
  expect(gerberOutput.F_Mask).toContain("X001600000Y005100000D01*")
})
