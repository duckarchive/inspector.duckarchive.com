import { extendTheme } from "@chakra-ui/react";

// const theme = {
//   styles: {
//     global: {
//       '.ag-paging-panel': {
//         color: 'gray.500',
//       },
//     },
//   },
// };

const theme = extendTheme({
  styles: {
    global: (props: any) => ({
      [`@media screen and (max-width: ${props.theme.breakpoints.md})`]: {
        ".ag-paging-panel": {
          justifyContent: "center",
          ".ag-paging-page-size": {
            display: "none",
          },
          ".ag-paging-row-summary-panel": {
            display: "none",
          },
        },
      },
    }),
  },
});

export default theme;
