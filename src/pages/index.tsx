import { type NextPage } from "next"
import Head from "next/head"
import { useState, useEffect, useRef, useLayoutEffect, FC, ReactElement } from "react"
import { Work_Sans } from "next/font/google"
import clsx from "clsx"
import { useDebouncedCallback } from "use-debounce"
import { env } from "~/env.mjs"

const workSans = Work_Sans({
	subsets: ["latin"],
})

const ADD_CONTENT_MILLIS = 140

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const NoSSR: FC<{ children: ReactElement }> = ({ children }) => {
	const [isMounted, setIsMounted] = useState(false)

	useLayoutEffect(() => {
		setIsMounted(true)
	}, [])

	return isMounted ? children : null
}

const getBotMessage = async ({
	messages,
	onContent,
	onFinish,
}: {
	messages: string[]
	onContent: (content: string) => void
	onFinish: () => void
}) => {
	const response = await fetch("/api/bot", {
		method: "POST",
		body: textEncoder.encode(
			JSON.stringify({
				messages,
			})
		),
	})

	if (response.body) {
		const reader = response.body.getReader()

		while (true) {
			const result = await reader.read()

			if (!result.done) {
				onContent(textDecoder.decode(result.value))
			} else {
				onFinish()

				break
			}
		}
	} else {
		console.error("This shouldn't happen")
	}
}

const Home: NextPage = () => {
	const [messageInput, setMessageInput] = useState("")

	const [messages, setMessages] = useState<string[]>([])

	const [addingContent, setAddingContent] = useState(true)

	const addingContentIndex = useRef(0)

	const addContent = (content: string) => {
		setMessages((prev) => [
			...prev.slice(0, addingContentIndex.current),
			(prev[addingContentIndex.current] ?? "") + content,
		])

		scrollToBottom()
	}

	const contentQueue = useRef<string[]>([])
	const receivingContent = useRef(false)

	const getNextBotMessage = ({ messages }: { messages: string[] }) => {
		void getBotMessage({
			messages,
			onContent: (content) => {
				if (!receivingContent.current) {
					receivingContent.current = true

					addContent(content)

					const intervalId = setInterval(() => {
						const next = contentQueue.current.shift()

						if (next !== undefined) {
							addContent(next)
						} else if (!receivingContent.current) {
							clearInterval(intervalId)

							addingContentIndex.current += 2

							setAddingContent(false)
						}
					}, ADD_CONTENT_MILLIS)
				} else {
					contentQueue.current.push(content)
				}
			},
			onFinish: () => {
				receivingContent.current = false
			},
		})
	}

	const firstMessageRequested = useRef(false)
	useEffect(() => {
		if (!firstMessageRequested.current) {
			firstMessageRequested.current = true

			getNextBotMessage({ messages })

			textInputRef?.current?.focus()
		}
	})

	const messagesRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () =>
		messagesRef.current?.scroll({ top: messagesRef.current?.scrollHeight, behavior: "smooth" })

	const textInputRef = useRef<HTMLTextAreaElement>(null)

	const onSend = useDebouncedCallback(
		async () => {
			if (buttonDisabled)
				return process.nextTick(() => setMessageInput((prev) => prev.trim()))

			setAddingContent(true)

			setMessages((prev) => [...prev, messageInput.trimEnd()])

			getNextBotMessage({ messages: [...messages, messageInput.trimEnd()] })

			process.nextTick(() => setMessageInput(""))

			setTimeout(() => setMessageInput(""), 50) // for some reason, on mobile, when onSend is called from onKeyDown event, doesn't erase text if called with process.nextTick

			scrollToBottom()
		},
		250,
		{
			leading: true,
		}
	)

	const buttonDisabled = messageInput.trim() === "" || addingContent

	return (
		<>
			<Head>
				<title>Building AI-driven education</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main
				className={clsx(
					"fixed bottom-0 h-screen w-full bg-primary text-white",
					workSans.className
				)}
				style={{
					padding:
						"env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
				}}
			>
				<div className="flex h-screen flex-col px-[10%] pt-[7vh]">
					<NoSSR>
						<div
							className={
								typeof navigator !== "undefined" &&
								navigator.userAgent.includes("Safari") &&
								!navigator.userAgent.includes("Chrome") &&
								!navigator.userAgent.includes("EdgiOS") &&
								navigator.userAgent.includes("iPhone")
									? "h-[9vh]"
									: "h-0"
							}
						></div>
					</NoSSR>

					<div className="relative flex h-full w-full flex-col overflow-y-scroll rounded-lg border-[0.5px] border-white/50 px-4 pt-2 text-lg">
						<div ref={messagesRef} className="overflow-y-scroll text-white/[0.85]">
							{messages.map((message, index) => {
								return (
									<div
										key={index}
										className={clsx(
											index % 2 === 1 && "font-medium opacity-[0.65]",
											"mb-1 whitespace-pre-line"
										)}
									>
										{message}
									</div>
								)
							})}

							<div className="h-[22vh]"></div>
						</div>

						<div className="absolute bottom-0 right-0 h-[15vh] min-h-[100px] w-full px-4 pb-4">
							<form
								onSubmit={(e) => {
									e.preventDefault()

									onSend()
								}}
								className="flex h-full w-full items-center justify-between rounded-lg border-[0.5px] border-white/50 bg-white/[0.06] backdrop-blur-lg"
							>
								<textarea
									value={messageInput}
									onChange={(e) => setMessageInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.code === "Enter") {
											onSend()
										}
									}}
									placeholder={addingContent ? undefined : "Ask something"}
									ref={textInputRef}
									autoCapitalize="false"
									autoSave="true"
									autoFocus
									className="scrollbar-none h-full w-full resize-none bg-transparent px-3 py-1.5 outline-none placeholder:text-white placeholder:opacity-[0.4]"
								/>

								<button
									className={clsx(
										"group my-4 mx-5 flex h-[9vh] w-[9vh] items-center justify-center rounded-lg border-[0.5px] border-white/50 px-[1.75vh] transition-all duration-150",
										buttonDisabled
											? "cursor-default bg-white/[0.06]"
											: "bg-white/[0.1] hover:bg-white/[0.15] active:bg-white/[0.15]"
									)}
									disabled={buttonDisabled}
								>
									<div
										className={clsx(
											"h-[5.5vh] w-[5.5vh] rounded-full border-4 border-white",
											buttonDisabled
												? "opacity-[0.65]"
												: "opacity-100 group-hover:opacity-100 group-active:opacity-100"
										)}
									></div>
								</button>
							</form>
						</div>
					</div>
					<footer>
						<div className="flex h-[7vh] items-center justify-center pb-[0.45vh]">
							<a
								href={`mailto:${env.NEXT_PUBLIC_CONTACT_EMAIL}`}
								className="cursor-pointer text-sm font-medium underline underline-offset-1 opacity-70 transition-all duration-150 hover:opacity-100 active:opacity-100"
							>
								Contact us here
							</a>
						</div>
					</footer>
				</div>
			</main>
		</>
	)
}

export default Home
