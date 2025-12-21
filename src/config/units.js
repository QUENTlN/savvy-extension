const WEIGHT_UNITS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },
]

const VOLUME_UNITS = [
  // Volumetric units
  { value: "mm3", label: "mm³", type: "volumetric" },
  { value: "cm3", label: "cm³", type: "volumetric" },
  { value: "m3", label: "m³", type: "volumetric" },
  { value: "l", label: "L", type: "volumetric" },
  { value: "in3", label: "in³", type: "volumetric" },
  { value: "ft3", label: "ft³", type: "volumetric" },
  { value: "qt", label: "qt", type: "volumetric" },
  { value: "gal", label: "gal", type: "volumetric" },
  { value: "pt", label: "pt", type: "volumetric" },
]

const DIMENSION_UNITS = [
  // Dimensional units
  { value: "mm", label: "mm", type: "dimensional" },
  { value: "cm", label: "cm", type: "dimensional" },
  { value: "m", label: "m", type: "dimensional" },
  { value: "in", label: "inches", type: "dimensional" },
  { value: "ft", label: "ft", type: "dimensional" },
  { value: "yd", label: "yd", type: "dimensional" },
]

const DISTANCE_UNITS = [
  { value: "km", label: "km" },
  { value: "mi", label: "mi" },
  { value: "m", label: "m" },
]

const DEFAULT_WEIGHT_UNIT = "g"
const DEFAULT_VOLUME_UNIT = "l"
const DEFAULT_DIMENSION_UNIT = "cm"
const DEFAULT_DISTANCE_UNIT = "km"
