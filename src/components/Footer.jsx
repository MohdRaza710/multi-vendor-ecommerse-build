import Link from "next/link";
import { FaLinkedin, FaGithub } from "react-icons/fa";


export default function Footer() {
    return (
        <footer className="border-t bg-white">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
                <div className="text-sm text-gray-600">
                    © {new Date().getFullYear()}{" "}
                    <span className="font-semibold text-gray-900">Bazario Market</span>
                    {" · "}
                </div>

                <span className="font-medium text-gray-900 text-center items-center justify-center">Build By Mohammed Raza</span>

                <div className="flex items-center gap-4">

                    <Link
                        href="https://  www.linkedin.com/in/mohammed-raza-92aaa4398"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-blue-600"
                    >
                        <FaLinkedin className="h-5 w-5" />
                    </Link>
                    <Link
                        href="https://github.com/MohdRaza710"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
                    >
                        <FaGithub className="h-5 w-5" />
                    </Link>
                </div>
            </div>
        </footer>
    );
}