import { FileText, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AgreementViewerProps {
  title?: string;
  body: string;
  terms?: string;
  maxHeight?: string;
  className?: string;
}

export function AgreementViewer({
  title,
  body,
  terms,
  maxHeight = '420px',
  className,
}: AgreementViewerProps) {
  const isHtml = (text: string) => /<[a-z][\s\S]*>/i.test(text);

  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-paper shadow-xs overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Document header badge */}
      <div className="flex items-center justify-between border-b border-line bg-paper-dim/60 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink uppercase tracking-wider">
          <FileText className="size-3.5 text-crimson-500" />
          <span>{title || 'Document Terms & Clauses'}</span>
        </div>
        <span className="text-[11px] font-medium text-ink-faint">Formatted Document</span>
      </div>

      {/* Main Document Content Canvas */}
      <div
        style={{ maxHeight }}
        className="overflow-y-auto p-5 sm:p-6 text-[14.5px] leading-relaxed text-ink select-text"
      >
        {isHtml(body) ? (
          <div
            dangerouslySetInnerHTML={{ __html: body }}
            className={cn(
              'prose-headings:font-display prose-headings:font-semibold prose-headings:text-ink',
              '[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-2 [&>h1]:mb-3 [&>h1]:border-b [&>h1]:border-line [&>h1]:pb-2',
              '[&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-2 [&>h2]:text-ink',
              '[&>h3]:text-[15px] [&>h3]:font-semibold [&>h3]:mt-3 [&>h3]:mb-1.5 [&>h3]:text-ink-soft',
              '[&>p]:mb-3 [&>p]:leading-relaxed [&>p]:text-ink-soft',
              '[&>u]:underline [&>u]:decoration-ink-soft/80 [&>u]:underline-offset-2',
              '[&>strong]:font-semibold [&>strong]:text-ink',
              '[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-2.5 [&>ul]:space-y-1.5 [&>ul]:text-ink-soft',
              '[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-2.5 [&>ol]:space-y-1.5 [&>ol]:text-ink-soft',
              '[&>li]:leading-relaxed',
              '[&>hr]:my-5 [&>hr]:border-line'
            )}
          />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed text-ink-soft">
            {body}
          </div>
        )}

        {/* Additional Terms Section */}
        {terms && terms.trim() && (
          <div className="mt-6 rounded-xl border border-line bg-paper-dim/70 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink">
              <ShieldAlert className="size-3.5 text-crimson-500" />
              <span>Additional Terms &amp; Conditions</span>
            </div>
            {isHtml(terms) ? (
              <div
                dangerouslySetInnerHTML={{ __html: terms }}
                className={cn(
                  'text-sm leading-relaxed text-ink-soft',
                  '[&>p]:mb-2 [&>u]:underline [&>strong]:text-ink [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4'
                )}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {terms}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
