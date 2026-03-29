import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/accounts/${id}`);
}
