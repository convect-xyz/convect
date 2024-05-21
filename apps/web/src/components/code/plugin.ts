import plugin from "tailwindcss/plugin";

export const codePlugin = plugin(function ({ addComponents }) {
  addComponents({
    ".keyword": {
      color: "#ff7b72",
    },
    ".comment": {
      color: "#8b949e",
    },
    ".constant": {
      color: "#79c0ff",
    },
    ".class_": {
      color: "#d2a8ff",
    },
    ".function_": {
      color: "#d2a8ff",
    },
    ".string": {
      color: "#a5d6ff",
    },
    ".variable": {
      color: "#ffa657",
    },
    ".literal": {
      color: "#79c0ff",
    },
  });
});
