resource "aws_eks_cluster" "main" {
  name     = "online-boutique-cluster"
  role_arn = "arn:aws:iam::047776567953:role/LabRole"
  

  vpc_config {
    subnet_ids = data.aws_subnets.default.ids
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "online-boutique-nodes"
  node_role_arn   = "arn:aws:iam::047776567953:role/LabRole"
  subnet_ids      = data.aws_subnets.default.ids

  scaling_config {
    desired_size = 2
    max_size     = 2
    min_size     = 1
  }

  instance_types = ["t3.medium"]

  depends_on = [aws_eks_cluster.main]
}