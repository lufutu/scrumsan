"use client"

import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Simple markdown renderer for basic formatting
  const renderMarkdown = (text: string) => {
    // Split by lines to handle block elements
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    
    let inCodeBlock = false
    let codeBlockContent = ''
    let inTable = false
    let tableRows: string[][] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={i} className="bg-slate-100 p-3 rounded-md my-2 overflow-x-auto">
              <code className="text-sm">{codeBlockContent}</code>
            </pre>
          )
          codeBlockContent = ''
          inCodeBlock = false
        } else {
          // Start code block
          inCodeBlock = true
        }
        continue
      }
      
      if (inCodeBlock) {
        codeBlockContent += line + '\n'
        continue
      }
      
      // Handle tables
      if (line.includes('|') && line.trim() !== '') {
        if (!inTable) {
          inTable = true
          tableRows = []
        }
        
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
        if (cells.length > 0) {
          tableRows.push(cells)
        }
        continue
      } else if (inTable) {
        // End table
        if (tableRows.length > 0) {
          elements.push(
            <table key={i} className="border-collapse border border-slate-300 my-2 w-full">
              <thead>
                <tr>
                  {tableRows[0]?.map((header, index) => (
                    <th key={index} className="border border-slate-300 px-3 py-2 bg-slate-100 font-medium text-left">
                      {renderInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-slate-300 px-3 py-2">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        inTable = false
        tableRows = []
      }
      
      // Handle regular lines
      if (!inTable) {
        if (line.trim() === '') {
          elements.push(<br key={i} />)
        } else {
          elements.push(
            <p key={i} className="my-1">
              {renderInlineMarkdown(line)}
            </p>
          )
        }
      }
    }
    
    // Handle remaining table if file ends with table
    if (inTable && tableRows.length > 0) {
      elements.push(
        <table key="end-table" className="border-collapse border border-slate-300 my-2 w-full">
          <thead>
            <tr>
              {tableRows[0]?.map((header, index) => (
                <th key={index} className="border border-slate-300 px-3 py-2 bg-slate-100 font-medium text-left">
                  {renderInlineMarkdown(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(2).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-slate-300 px-3 py-2">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    
    return elements
  }
  
  // Handle inline markdown formatting
  const renderInlineMarkdown = (text: string) => {
    // Handle images: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return `<img src="${url}" alt="${alt}" class="max-w-full h-auto my-2 rounded" />`
    })
    
    // Handle links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${linkText}</a>`
    })
    
    // Handle bold: **text** or __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    text = text.replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>')
    
    // Handle italic: *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    text = text.replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
    
    // Handle inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }
  
  if (!content.trim()) {
    return null
  }
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderMarkdown(content)}
    </div>
  )
}