import { Moon, Sun, Monitor, Terminal, Palette, Github } from "lucide-react"

import { useTheme } from "../provider/theme-provider"
import { Button } from "./button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-none border-2 border-primary hover:bg-primary font-mono font-bold uppercase tracking-wider rounded-none">
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("github-dark")}>
                    <Github className="mr-2 h-4 w-4" />
                    <span>GitHub Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("gruvbox")}>
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Gruvbox</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("terminal")}>
                    <Terminal className="mr-2 h-4 w-4" />
                    <span>Terminal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}