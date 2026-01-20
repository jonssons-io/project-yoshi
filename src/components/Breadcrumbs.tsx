import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	type BreadcrumbItem as BreadcrumbItemType,
	useBreadcrumbs,
} from "@/hooks/use-breadcrumbs";

interface BreadcrumbsProps {
	items?: BreadcrumbItemType[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
	const defaultItems = useBreadcrumbs();
	const breadcrumbs = items ?? defaultItems;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((crumb) => (
					<BreadcrumbItem key={crumb.path}>
						{crumb.isLast ? (
							<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
						) : (
							<>
								<BreadcrumbLink asChild>
									<Link to={crumb.path}>{crumb.label}</Link>
								</BreadcrumbLink>
								<BreadcrumbSeparator>
									<ChevronRight className="h-4 w-4" />
								</BreadcrumbSeparator>
							</>
						)}
					</BreadcrumbItem>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
