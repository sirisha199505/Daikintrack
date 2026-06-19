import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import ProductManager from "../../components/products/ProductManager";

export default function ManageStock() {
  const { user } = useAuth();
  const { branches, viewBranchId } = useInventory();
  // The branch the manager is operating on — their own, or one they switched to.
  const branchId = viewBranchId || user.branchId;
  const branch =
    branches.find((b) => b.id === branchId) ||
    (branchId === user.branchId ? user.branch : null);
  return (
    <ProductManager
      branchId={branchId}
      title="Manage Stock"
      subtitle={
        branch
          ? `Inventory at ${branch.name} · ${branch.location}`
          : "Stock levels across all hubs"
      }
    />
  );
}
