import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

export async function POST(req: Request) {
  const {
    messages: uiMessages,
    files,
    projectId,
  }: { messages: UIMessage[]; files: Record<string, FileNode>; projectId?: string } =
    await req.json();

  // Reconstruct the VirtualFileSystem from serialized data
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  const modelMessages = await convertToModelMessages(uiMessages);

  const model = getLanguageModel();
  // Use fewer steps for mock provider to prevent repetition
  const isMockProvider = !process.env.ANTHROPIC_API_KEY;
  const result = streamText({
    model: model as any,
    system: generationPrompt,
    messages: modelMessages,
    maxOutputTokens: 10_000,
    stopWhen: stepCountIs(isMockProvider ? 4 : 40),
    onError: (err: any) => {
      console.error(err);
    },
    tools: {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    },
    onFinish: async () => {
      if (projectId) {
        try {
          const session = await getSession();
          if (!session) {
            console.error("User not authenticated, cannot save project");
            return;
          }

          await prisma.project.update({
            where: {
              id: projectId,
              userId: session.userId,
            },
            data: {
              messages: JSON.stringify(uiMessages),
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

export const maxDuration = 120;
