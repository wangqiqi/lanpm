import RegionButton from '@renderer/ui/RegionButton'

interface ViewCrossLinkProps {
  children: React.ReactNode
  onClick: () => void
}

/** 跨视图捷径（比 type="link" 更易发现） */
export default function ViewCrossLink({
  children,
  onClick
}: ViewCrossLinkProps): React.ReactElement {
  return (
    <RegionButton variant="toolbar" onClick={onClick}>
      {children}
    </RegionButton>
  )
}
