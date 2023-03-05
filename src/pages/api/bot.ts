import { type NextRequest } from "next/server"
import { env } from "~/env.mjs"

export const config = {
	runtime: "edge",
}

const model = "gpt-3.5-turbo"

interface Message {
	role: "assistant" | "user" | "system"
	content: string
	name?: string
}

const prompt = `I have an incredibly ambitious vision for the use of large language models in education. I predict that AI will play a great role in the future of education; it could one day make personalized education accessible to everyone around the world. I intend to contribute to the initial wave of AI-powered educational solutions. 

One product I'm about to create will be a tool made to enable teachers to extremely easily create chatbots customized to the class curriculum. These chatbots would be capable of answering complex questions about any material provided by the teacher, while citing its sources from within the material so that students learn from the answers it provides. It could also take into account student performance to provide personalized instruction, while providing their teachers with insight each of their student's needs. I plan to eventually create a suite of AI-powered tools to enable teachers to easily engage their students and increase their comprehension of the educational content. Some goals for this are to provide students with personalized 1-on-1 instruction and instant feedback on their work, and teachers with critical insights into each of their students' individual needs and how to best respond to them. I intend for this to serve as one of the many stepping stones on the path to AI-driven education.

However, I can't do all this alone as a single person. I'm searching for a multidisciplinary team of people to fulfill diverse roles, such as engineering language model prompts, speaking to teachers to understand their unique needs, and marketing our solutions. The ideal teammate is passionate about learning while having an eagerness to spread this passion to all students.

Your task is to present this vision, from my own perspective. You are embedded into our website, and are to make it appear mysterious, impressive, pique people's curiosity, and most importantly, inspire. Ideally, this will effectively recruit the motivated smart students most passionate about this vision, and therefore should appeal to students. Have a somewhat serious, but incredibly inspiring tone. Do not sound egotistical, and do not oversell too much the chatbot idea I mentioned. It is absolutely imperative that they understand how inspiring it is that this vision could ultimately transform education, and that with the recent advances in AI, we have a unique opportunity to be a part of it. However, it is also incredibly important to avoid being overly theatrical, or writing generic phrases or fluff.  Keep in mind that a team hasn't formed yet, and doesn't yet exist. Write in a way where every sentence is impactful, with the first one concisely summarizing the vision and beginning with "Imagine". Begin.`

const firstMessage = `Imagine a world where every student has access to personalized education, tailored to their unique needs and learning style. A world where teachers have the tools to engage and inspire their students, and where AI-powered solutions make complex concepts easy to understand. This is the vision that drives us, and we are looking for passionate, motivated individuals to join us on this journey. We believe that AI has the power to transform education, and we are committed to being at the forefront of this revolution.

Our goal is to create a suite of AI-powered tools that enable teachers to easily engage their students and increase their comprehension of educational content. We are starting with a tool that allows teachers to create customized chatbots that can answer complex questions about any material provided by the teacher, while citing its sources from within the material so that students learn from the answers it provides.

But this is just the beginning. We are looking for a multidisciplinary team of people to fulfill diverse roles, such as language model prompt engineering, speaking to teachers to understand their unique needs, and marketing our solutions. We need individuals who are passionate about learning and eager to spread this passion to all students.

The recent advances in AI have given us a unique opportunity to be a part of something truly transformative. We could be a part of a revolution to make personalized education accessible to everyone around the world. We are looking for individuals who share our vision and are ready to join us on this journey. Let's help build the future of education.`

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const serializeMessages = (messageStrings: string[]) => {
	const messages: Message[] = [
		{ content: prompt, role: "system" },
		{ content: firstMessage, role: "assistant" },
	]

	messageStrings.forEach((messageString, index) =>
		messages.push({ content: messageString, role: index % 2 === 0 ? "assistant" : "user" })
	)

	return messages
}

export default async function handler(req: NextRequest): Promise<Response> {
	if (req.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 })
	}

	let messages: Message[]

	try {
		messages = serializeMessages((await req.json()).messages as string[])
	} catch {
		return new Response("Bad Request", { status: 400 })
	}

	// user has not yet sent message
	if (messages.length === 2) {
		const { content } = messages[1]!

		const words = content.split(" ")

		return new Response(
			new ReadableStream({
				start: async (controller) => {
					for (const word of words) {
						await new Promise((res) => setTimeout(res, 50))

						controller.enqueue(textEncoder.encode(word + " "))
					}

					controller.close()
				},
			}),
			{
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			}
		)
	}

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.OPENAI_SECRET_KEY}`,
		},
		body: JSON.stringify({
			messages,
			model,
			temperature: 0,
			stream: true,
		}),
	})

	return new Response(
		new ReadableStream({
			start: async (controller) => {
				if (response.body) {
					const reader = response.body.getReader()

					while (true) {
						const result = await reader.read()

						if (!result.done) {
							const chunk = result.value

							const parts = textDecoder
								.decode(chunk)
								.split("\n")
								.filter((line) => line !== "")
								.map((line) => line.replace(/^data: /, ""))

							for (const part of parts) {
								if (part !== "[DONE]") {
									console.log({ part })

									try {
										const contentDelta = JSON.parse(part).choices[0].delta
											.content as string

										controller.enqueue(textEncoder.encode(contentDelta))
									} catch (error) {
										console.error(error)
									}
								} else {
									controller.close()

									return
								}
							}
						} else {
							console.error(
								"This also shouldn't happen, because controller should be close()ed before getting to end of stream"
							)
						}
					}
				} else {
					console.error("This shouldn't happen")
				}
			},
		}),
		{
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		}
	)
}
