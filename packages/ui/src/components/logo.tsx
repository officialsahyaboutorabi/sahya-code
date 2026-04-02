import { ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M12 16H4V8H12V16Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-o" d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"div">, "ref" | "class">) => {
  return (
    <div
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{
        "font-family": "monospace",
        "font-size": "10px",
        "line-height": "1.2",
        color: "var(--icon-strong-base)",
        "white-space": "pre",
      }}
    >
{`  /$$$$$$   /$$$$$$  /$$   /$$ /$$     /$$ /$$$$$$ 
 /$$__  $$ /$$__  $$| $$  | $$|  $$   /$$//$$__  $$
| $$  \__/| $$  \ $$| $$  | $$ \  $$ /$$/| $$  \ $$
|  $$$$$$ | $$$$$$$$| $$$$$$$$  \  $$$$/ | $$$$$$$$
 \____  $$| $$__  $$| $$__  $$   \  $$/  | $$__  $$
 /$$  \ $$| $$  | $$| $$  | $$    | $$   | $$  | $$
|  $$$$$$/| $$  | $$| $$  | $$    | $$   | $$  | $$
 \______/ |__/  |__/|__/  |__/    |__/   |__/  |__/
  /$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$           
 /$$__  $$ /$$__  $$| $$__  $$| $$_____/           
| $$  \__/| $$  \ $$| $$  \ $$| $$                 
| $$      | $$  | $$| $$  | $$| $$$$$              
| $$      | $$  | $$| $$  | $$| $$__/              
| $$    $$| $$  | $$| $$  | $$| $$                 
|  $$$$$$/|  $$$$$$/| $$$$$$$/| $$$$$$$$            
 \______/  \______/ |_______/ |________/           `}
    </div>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <div
      data-component="logo-text"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{
        "font-family": "monospace",
        "font-size": "8px",
        "line-height": "1.1",
        color: "var(--icon-strong-base)",
        "white-space": "pre",
      }}
    >
{`  /$$$$$$   /$$$$$$  /$$   /$$ /$$     /$$ /$$$$$$ 
 /$$__  $$ /$$__  $$| $$  | $$|  $$   /$$//$$__  $$
| $$  \__/| $$  \ $$| $$  | $$ \  $$ /$$/| $$  \ $$
|  $$$$$$ | $$$$$$$$| $$$$$$$$  \  $$$$/ | $$$$$$$$
 \____  $$| $$__  $$| $$__  $$   \  $$/  | $$__  $$
 /$$  \ $$| $$  | $$| $$  | $$    | $$   | $$  | $$
|  $$$$$$/| $$  | $$| $$  | $$    | $$   | $$  | $$
 \______/ |__/  |__/|__/  |__/    |__/   |__/  |__/
  /$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$           
 /$$__  $$ /$$__  $$| $$__  $$| $$_____/           
| $$  \__/| $$  \ $$| $$  \ $$| $$                 
| $$      | $$  | $$| $$  | $$| $$$$$              
| $$      | $$  | $$| $$  | $$| $$__/              
| $$    $$| $$  | $$| $$  | $$| $$                 
|  $$$$$$/|  $$$$$$/| $$$$$$$/| $$$$$$$$            
 \______/  \______/ |_______/ |________/           `}
    </div>
  )
}
