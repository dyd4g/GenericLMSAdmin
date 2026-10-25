import {createTheme} from '@mui/material';
const theme=createTheme({palette:{primary:{main:'#245bd6'},background:{default:'#f7f9fb',paper:'#fff'},text:{primary:'#192631',secondary:'#62717e'},divider:'#e3e8ed'},typography:{fontFamily:'"Segoe UI",Arial,sans-serif',h4:{fontSize:28,fontWeight:650,letterSpacing:-.7},h6:{fontSize:17,fontWeight:600},button:{textTransform:'none',fontWeight:600}},shape:{borderRadius:8},components:{MuiButton:{defaultProps:{disableElevation:true}},MuiTableCell:{styleOverrides:{head:{background:'#fafbfd',color:'#62717e',fontSize:12},body:{fontSize:13,paddingTop:18,paddingBottom:18}}},MuiTab:{styleOverrides:{root:{textTransform:'none',minWidth:0,marginRight:24,paddingLeft:0,paddingRight:0}}}}});

export default theme;
