import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={`markdown-renderer ${className || ''}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !codeClassName;

            if (isInline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <Highlight
                theme={themes.vsDark}
                code={codeString}
                language={language || 'text'}
              >
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className="code-block"
                    style={{
                      ...style,
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      margin: '1rem 0',
                    }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="md-link"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ children }) {
            return (
              <h1 className="md-h1">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="md-h2">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="md-h3">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="md-h4">
                {children}
              </h4>
            );
          },
          p({ children }) {
            return (
              <p className="md-p">
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className="md-ul">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="md-ol">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="md-li">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="md-blockquote">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="md-hr" />;
          },
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="md-img"
              />
            );
          },
          strong({ children }) {
            return (
              <strong className="md-strong">
                {children}
              </strong>
            );
          },
          em({ children }) {
            return (
              <em className="md-em">
                {children}
              </em>
            );
          },
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

export default MarkdownRenderer;
