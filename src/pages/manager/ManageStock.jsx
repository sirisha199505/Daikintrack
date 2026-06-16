import { useAuth } from "../../context/AuthContext";
import ProductManager from "../../components/products/ProductManager";

export default function ManageStock() {
  const { user } = useAuth();
  return (
    <ProductManager
      branchId={user.branchId}
      title="Manage Stock"
      subtitle={`Products at ${user.branch?.name} · ${user.branch?.location}`}
    />
  );
}
