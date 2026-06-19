import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import ProductManager from "../../components/products/ProductManager";

export default function ManageStock() {
  const { user } = useAuth();
  const { branches, viewBranchId, isViewingOtherBranch } = useInventory();
  // Show the branch the manager is currently viewing (own branch by default).
  const branchId = viewBranchId || user.branchId;
  const branch =
    branches.find((b) => b.id === branchId) ||
    (branchId === user.branchId ? user.branch : null);
  return (
    <ProductManager
      branchId={branchId}
      readOnly={isViewingOtherBranch}
      title="Manage Stock"
      subtitle={
        branch
          ? `Inventory at ${branch.name} · ${branch.location}${
              isViewingOtherBranch ? " · read-only" : ""
            }`
          : "Stock levels across all hubs"
      }
    />
  );
}
